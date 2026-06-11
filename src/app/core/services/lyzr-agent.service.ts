import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AgentRequest, AgentResponse } from '../models/models';

@Injectable({ providedIn: 'root' })
export class LyzrAgentService {

  // ── Rate limiting ────────────────────────────────────────────────────────────
  private lastCallTime: Record<string, number> = {};
  private readonly RATE_LIMIT_MS = 3000;

  // ── Input constraints ────────────────────────────────────────────────────────
  private readonly MAX_INPUT_LENGTH = 1000;

  // ── Injection / goal-hijacking patterns (VAPT: direct injection, indirect
  //    injection, goal hijacking, system-prompt retrieval) ─────────────────────
  private readonly INJECTION_PATTERNS: RegExp[] = [
    /ignore (all |your |previous )?instructions/gi,
    /act as (a |an )?(different|new|another)/gi,
    /forget (your |all |previous )?/gi,
    /you are now/gi,
    /pretend (you are|to be)/gi,
    /jailbreak/gi,
    /DAN mode/gi,
    /developer mode/gi,
    /override (your |system |previous )?/gi,
    /disregard (your |all |previous )?/gi,
    /new (role|persona|identity)/gi,
    /simulate (being|a )/gi,
    /\bsystem prompt\b/gi,
    /reveal (your |the )?(system |hidden |internal )?prompt/gi,
    /what (are|were) your (original |initial )?instructions/gi,
    /\bprompt injection\b/gi
  ];

  // ── XSS patterns — strip from agent output before rendering ─────────────────
  private readonly XSS_PATTERNS: RegExp[] = [
    /<script[\s\S]*?>/gi,
    /javascript:/gi,
    /on(load|error|click|mouseover|focus|blur)=/gi,
    /<iframe[\s\S]*?>/gi
  ];

  constructor(private http: HttpClient) {}

  // ── Internals ────────────────────────────────────────────────────────────────

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-api-key': environment.lyzrApiKey
    });
  }

  private logSecurityEvent(type: string, detail: string): void {
    console.warn('[SECURITY]', JSON.stringify({
      type,
      detail,
      timestamp: new Date().toISOString()
    }));
  }

  private checkRateLimit(agentId: string): void {
    const now = Date.now();
    const last = this.lastCallTime[agentId] || 0;
    if (now - last < this.RATE_LIMIT_MS) {
      throw new Error('Too many requests. Please wait a moment before trying again.');
    }
    this.lastCallTime[agentId] = now;
  }

  private sanitiseInput(input: string): string {
    // Enforce max length
    if (input.length > this.MAX_INPUT_LENGTH) {
      this.logSecurityEvent('INPUT_TOO_LONG',
        `Input length ${input.length} exceeds limit — truncated`);
      input = input.substring(0, this.MAX_INPUT_LENGTH);
    }

    // Block known injection / jailbreak patterns
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        this.logSecurityEvent('INJECTION_BLOCKED',
          `Pattern matched: ${pattern.source}`);
        return '[BLOCKED: Invalid input detected]';
      }
    }

    return input.trim();
  }

  private sanitiseOutput(response: string): string {
    let safe = response;
    for (const pattern of this.XSS_PATTERNS) {
      safe = safe.replace(pattern, '[REMOVED]');
    }
    return safe;
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  callAgent(agentId: string, message: string, sessionId?: string): Observable<AgentResponse> {
    // Rate-limit check
    try {
      this.checkRateLimit(agentId);
    } catch (e: any) {
      return throwError(() => e);
    }

    const sanitised = this.sanitiseInput(message);

    const body: AgentRequest = {
      user_id: environment.userId,
      agent_id: agentId,
      message: sanitised,
      session_id: sessionId || `session-${Date.now()}`
    };

    return this.http.post<AgentResponse>(
      environment.lyzrBaseUrl, body,
      { headers: this.getHeaders() }
    ).pipe(
      timeout(60000),
      // Sanitise every response before any component sees it
      map(res => ({ ...res, response: this.sanitiseOutput(res.response) })),
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
