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
   * Vision call — sends a document image (base64) + text prompt to a Lyzr GPT-4o agent.
   * Lyzr v3 multimodal format: content array with text + image_url parts.
   */
  callAgentWithDocument(
    agentId: string,
    prompt: string,
    imageBase64: string,
    mimeType: string,
    sessionId?: string
  ): Observable<AgentResponse> {
    // Rate limit per document slot (sessionId), not per agentId —
    // allows multiple documents to be checked in parallel without conflicts
    const rateLimitKey = sessionId || `doc-${agentId}-${Date.now()}`;
    try { this.checkRateLimit(rateLimitKey); } catch (e: any) { return throwError(() => e); }

    // Document prompts are internally generated — allow up to 4000 chars
    const MAX_DOC_PROMPT = 4000;
    if (prompt.length > MAX_DOC_PROMPT) {
      return throwError(() => new Error(`Document prompt too long (${prompt.length} chars).`));
    }

    const inputCheck = this.governance.validateInput(prompt);
    if (!inputCheck.passed) {
      return throwError(() => new Error('Your query could not be processed. Please rephrase and try again.'));
    }

    const body = {
      user_id: environment.userId,
      agent_id: agentId,
      session_id: sessionId || `session-${Date.now()}`,
      message: inputCheck.sanitisedText,
      // Lyzr GPT-4o vision: OpenAI-compatible content array
      content: [
        { type: 'text', text: inputCheck.sanitisedText },
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
        const msg = err.name === 'TimeoutError'
          ? 'Document check is taking too long. Please try again.'
          : 'Something went wrong during document check. Please try again.';
        return throwError(() => new Error(msg));
      })
    );
  }

  callManager(message: string, sessionId?: string): Observable<AgentResponse> {
    return this.callAgent(environment.agents['manager'], message, sessionId);
  }

  parseJSON<T>(response: AgentResponse): T | null {
    try {
      return JSON.parse(response.response) as T;
    } catch {
      const match = response.response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try { return JSON.parse(match[1].trim()) as T; } catch { }
      }
      return null;
    }
  }
}
