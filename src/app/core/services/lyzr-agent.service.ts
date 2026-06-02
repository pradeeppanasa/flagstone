import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AgentRequest, AgentResponse } from '../models/models';

@Injectable({ providedIn: 'root' })
export class LyzrAgentService {

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-api-key': environment.lyzrApiKey
    });
  }

  callAgent(agentId: string, message: string, sessionId?: string): Observable<AgentResponse> {
    const body: AgentRequest = {
      user_id: environment.userId,
      agent_id: agentId,
      message: message,
      session_id: sessionId || `session-${Date.now()}`
    };
    return this.http.post<AgentResponse>(
      environment.lyzrBaseUrl, body,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(err => {
        console.error('Lyzr API error:', err);
        return throwError(() => new Error(err.message || 'Agent call failed'));
      })
    );
  }

  // Call Manager Agent — routes automatically to correct specialist
  callManager(message: string, sessionId?: string): Observable<AgentResponse> {
    return this.callAgent(environment.agents['manager'], message, sessionId);
  }

  parseJSON<T>(response: AgentResponse): T | null {
    try {
      // Try direct parse first
      return JSON.parse(response.response) as T;
    } catch {
      // Try to extract JSON from markdown code blocks
      const match = response.response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try { return JSON.parse(match[1]) as T; } catch { }
      }
      // Return raw response as summary if not JSON
      return null;
    }
  }
}
