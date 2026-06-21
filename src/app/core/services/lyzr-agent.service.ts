import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AgentRequest, AgentResponse } from '../models/models';
import { GovernanceService } from './governance.service';

@Injectable({ providedIn: 'root' })
export class LyzrAgentService {

  // ── Rate limiting ────────────────────────────────────────────────────────────
  private lastCallTime: Record<string, number> = {};
  private readonly RATE_LIMIT_MS = 3000;

  // ── Input constraints ────────────────────────────────────────────────────────
  private readonly MAX_INPUT_LENGTH = 1000;

  // ── XSS stripping — HTML/JS in agent output before Angular renders it ────────
  private readonly XSS_PATTERNS: RegExp[] = [
    /<script[\s\S]*?>/gi,
    /javascript:/gi,
    /on(load|error|click|mouseover|focus|blur)=/gi,
    /<iframe[\s\S]*?>/gi
  ];

  constructor(
    private http: HttpClient,
    private governance: GovernanceService
  ) {}

  // ── Internals ────────────────────────────────────────────────────────────────

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-api-key': environment.lyzrApiKey
    });
  }

  private checkRateLimit(agentId: string): void {
    const now = Date.now();
    const last = this.lastCallTime[agentId] || 0;
    if (now - last < this.RATE_LIMIT_MS) {
      throw new Error('Too many requests. Please wait a moment before trying again.');
    }
    this.lastCallTime[agentId] = now;
  }

  private stripXss(text: string): string {
    let safe = text;
    for (const pattern of this.XSS_PATTERNS) {
      safe = safe.replace(pattern, '[REMOVED]');
    }
    return safe;
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  callAgent(agentId: string, message: string, sessionId?: string): Observable<AgentResponse> {
    // 1. Rate limiting
    try {
      this.checkRateLimit(agentId);
    } catch (e: any) {
      return throwError(() => e);
    }

    // 2. Enforce max input length — reject with user-facing message
    if (message.length > this.MAX_INPUT_LENGTH) {
      return throwError(() => new Error(
        `Query too long. Please keep your query under ${this.MAX_INPUT_LENGTH} characters.`
      ));
    }
    const trimmed = message;

    // 3. Governance gate: PII redaction + injection/content-safety check
    const inputCheck = this.governance.validateInput(trimmed);
    if (!inputCheck.passed) {
      return throwError(() => new Error('Your query could not be processed. Please rephrase and try again.'));
    }

    const body: AgentRequest = {
      user_id: environment.userId,
      agent_id: agentId,
      message: inputCheck.sanitisedText, // PII already redacted
      session_id: sessionId || `session-${Date.now()}`
    };

    return this.http.post<AgentResponse>(
      environment.lyzrBaseUrl, body,
      { headers: this.getHeaders() }
    ).pipe(
      timeout(60000),
      map(res => {
        // 4. Governance output check (PII redaction in response)
        const outputCheck = this.governance.validateOutput(res.response);
        // 5. XSS strip (transport-level HTML safety)
        const clean = this.stripXss(outputCheck.sanitisedText);
        return { ...res, response: clean };
      }),
      catchError((err: any) => {
        if (err.name !== 'TimeoutError') {
          console.error('Lyzr API error:', err);
        }
        const msg = err.name === 'TimeoutError'
          ? 'The search is taking too long. Please try again.'
          : err.message?.startsWith('Too many requests')
            ? err.message
            : 'Something went wrong. Please try again.';
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Vision call — used for Gate 2 OCR extraction (kybKyc agent).
   * Note: Lyzr v3 REST API does not forward base64 images to the underlying model.
   * Gate 1 quality checks use client-side pixel analysis instead (see kyc-onboarding.component.ts).
   */
  callAgentWithDocument(
    agentId: string,
    prompt: string,
    imageBase64: string,
    mimeType: string,
    sessionId?: string
  ): Observable<AgentResponse> {
    const rateLimitKey = sessionId || `doc-${agentId}-${Date.now()}`;
    try { this.checkRateLimit(rateLimitKey); } catch (e: any) { return throwError(() => e); }

    const MAX_DOC_PROMPT = 4000;
    if (prompt.length > MAX_DOC_PROMPT) {
      return throwError(() => new Error(`Document prompt too long (${prompt.length} chars).`));
    }

    const inputCheck = this.governance.validateInput(prompt);
    if (!inputCheck.passed) {
      return throwError(() => new Error('Your query could not be processed. Please rephrase and try again.'));
    }

    const body = {
      user_id:    environment.userId,
      agent_id:   agentId,
      session_id: sessionId || `session-${Date.now()}`,
      message:    inputCheck.sanitisedText,
      content: [
        { type: 'text',      text:      inputCheck.sanitisedText },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
      ]
    };

    return this.http.post<AgentResponse>(
      environment.lyzrBaseUrl, body,
      { headers: this.getHeaders() }
    ).pipe(
      timeout(90000),
      map(res => ({ ...res, response: this.stripXss(this.governance.validateOutput(res.response).sanitisedText) })),
      catchError((err: any) => {
        let msg: string;
        if (err.name === 'TimeoutError') {
          msg = 'Document check is taking too long. Please try again.';
        } else if (err.status === 429) {
          msg = 'Too many requests. Please wait a moment and try again.';
        } else if (err.status === 401 || err.status === 403) {
          msg = `Authentication error (${err.status}). Check the API key.`;
        } else if (err.status === 400 || err.status === 422) {
          msg = `Request error (${err.status}): ${err.error?.detail || err.error?.message || 'Invalid request format'}.`;
        } else if (err.status >= 500) {
          msg = `Lyzr server error (${err.status}). Please try again.`;
        } else {
          msg = `Document check failed${err.status ? ' (' + err.status + ')' : ''}: ${err.error?.detail || err.message || 'unknown error'}.`;
        }
        console.error('callAgentWithDocument error:', err.status, err.error || err.message);
        return throwError(() => new Error(msg));
      })
    );
  }

  callManager(message: string, sessionId?: string): Observable<AgentResponse> {
    return this.callAgent(environment.agents['manager'], message, sessionId);
  }

  // Orchestration call — carries OCR-extracted data so needs a higher char limit than callAgent.
  callAgentKyb(agentId: string, message: string, sessionId?: string): Observable<AgentResponse> {
    const rateLimitKey = sessionId || `kyb-${agentId}-${Date.now()}`;
    try { this.checkRateLimit(rateLimitKey); } catch (e: any) { return throwError(() => e); }

    const MAX_KYB_LENGTH = 8000;
    if (message.length > MAX_KYB_LENGTH) {
      return throwError(() => new Error(`Orchestration message too long (${message.length} chars).`));
    }

    const inputCheck = this.governance.validateInput(message);
    if (!inputCheck.passed) {
      return throwError(() => new Error('Your query could not be processed. Please rephrase and try again.'));
    }

    const body: AgentRequest = {
      user_id: environment.userId,
      agent_id: agentId,
      message: inputCheck.sanitisedText,
      session_id: sessionId || `kyb-session-${Date.now()}`
    };

    return this.http.post<AgentResponse>(environment.lyzrBaseUrl, body, { headers: this.getHeaders() }).pipe(
      timeout(120000),
      map(res => ({ ...res, response: this.stripXss(this.governance.validateOutput(res.response).sanitisedText) })),
      catchError((err: any) => {
        const msg = err.name === 'TimeoutError'
          ? 'KYB verification timed out. Please try again.'
          : err.status === 404
            ? `Agent not found (404). Check agent ID "${agentId}" is still active in Lyzr Studio.`
          : err.status >= 500 ? `Lyzr server error (${err.status}). Please try again.`
          : err.message || 'KYB verification failed.';
        return throwError(() => new Error(msg));
      })
    );
  }

  parseJSON<T>(response: AgentResponse): T | null {
    const text = response.response;
    // 1. Direct parse
    try { return JSON.parse(text) as T; } catch { /* fall through */ }
    // 2. Fenced code block ```json ... ```
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) { try { return JSON.parse(fenced[1].trim()) as T; } catch { /* fall through */ } }
    // 3. First { ... } object anywhere in the response (agent adds prose before/after JSON)
    const obj = text.match(/(\{[\s\S]*\})/);
    if (obj) { try { return JSON.parse(obj[1].trim()) as T; } catch { /* fall through */ } }
    return null;
  }
}
