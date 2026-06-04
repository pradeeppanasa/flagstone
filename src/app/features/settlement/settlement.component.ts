import { Component } from '@angular/core';
import { LyzrAgentService } from '../../core/services/lyzr-agent.service';
import { environment } from '../../../environments/environment';
import { SettlementAlert } from '../../core/models/models';

@Component({
  selector: 'app-settlement',
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Settlement Exception Monitor</h1>
        <p class="subtitle">Detect and resolve multi-currency settlement exceptions</p>
      </div>

      <div class="input-card">
        <h2>Report an Exception</h2>
        <textarea [(ngModel)]="exceptionInput" rows="4"
          placeholder="Describe the exception. Example: A GBP/USD FX trade for GBP 500,000 (ref FX-2026-001) was confirmed at 09:30 GMT. USD settlement expected by 10:00 GMT. Not received by 10:30 GMT.">
        </textarea>
        <button (click)="analyseException()" [disabled]="loading || !exceptionInput" class="btn-primary">
          {{ loading ? 'Analysing...' : 'Analyse Exception' }}
        </button>
      </div>

      <div class="quick-tests">
        <h2>Quick Test Cases</h2>
        <div class="test-buttons">
          <button *ngFor="let t of testCases" (click)="runTest(t)" class="btn-test">{{ t.label }}</button>
        </div>
      </div>

      <div *ngIf="error" class="error-bar">{{ error }}</div>
      <div *ngIf="loading" class="loading-bar"><div class="spinner"></div> Analysing exception...</div>

      <div *ngIf="alerts.length > 0" class="results">
        <h2>Exception Alerts</h2>
        <div *ngFor="let alert of alerts" class="exception-card" [class]="'border-' + alert.severity">
          <div class="exc-header">
            <span class="exc-id">{{ alert.exception_id }}</span>
            <app-impact-badge [level]="alert.severity"></app-impact-badge>
            <span class="exc-type">{{ alert.exception_type }}</span>
          </div>
          <div class="exc-body">
            <p><strong>{{ alert.currency_pair }}</strong> — {{ alert.base_currency }} {{ alert.amount | number }}</p>
            <p>{{ alert.summary }}</p>
            <p class="timeline">{{ alert.timeline }}</p>
            <p class="action"><strong>Action:</strong> {{ alert.recommended_action }}</p>
            <div *ngIf="alert.escalate_to && alert.escalate_to.length > 0" class="escalate">
              <strong>Escalate to:</strong>
              <span *ngFor="let e of alert.escalate_to" class="escalate-tag">{{ e }}</span>
            </div>
            <p class="status">Status: <strong>{{ alert.resolution_status }}</strong></p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 900px; }
    .page-header { margin-bottom: 24px; }
    h1 { font-size: 22px; color: #1a3a5c; margin: 0 0 4px; }
    h2 { font-size: 15px; color: #1a3a5c; margin: 0 0 12px; }
    .subtitle { color: #6b7280; font-size: 13px; margin: 0; }
    .input-card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    textarea { width: 100%; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; font-family: Arial; resize: vertical; margin-bottom: 12px; box-sizing: border-box; }
    .btn-primary { background: #1a3a5c; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .quick-tests { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .test-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
    .btn-test { background: #f3f4f6; border: 1px solid #e5e7eb; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; color: #374151; }
    .btn-test:hover { background: #ebf3fa; border-color: #2e75b6; }
    .error-bar { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 10px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; }
    .loading-bar { display: flex; align-items: center; gap: 10px; padding: 16px; color: #6b7280; font-size: 13px; }
    .spinner { width: 18px; height: 18px; border: 3px solid #e5e7eb; border-top-color: #2e75b6; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .exception-card { background: white; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border-left: 4px solid #e5e7eb; }
    .border-critical { border-left-color: #dc2626; }
    .border-high { border-left-color: #ea580c; }
    .border-medium { border-left-color: #d97706; }
    .border-low { border-left-color: #16a34a; }
    .exc-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .exc-id { font-weight: 700; font-size: 14px; color: #1a3a5c; }
    .exc-type { font-size: 11px; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; color: #374151; margin-left: auto; }
    .exc-body p { font-size: 13px; color: #374151; margin: 4px 0; }
    .timeline { color: #6b7280; font-style: italic; white-space: pre-line; }
    .action { color: #1d4ed8; }
    .escalate { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 8px 0; }
    .escalate-tag { background: #fef2f2; color: #dc2626; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .status { font-size: 12px; color: #6b7280; }
    .results h2 { font-size: 15px; color: #1a3a5c; margin-bottom: 12px; }
  `]
})
export class SettlementComponent {
  exceptionInput = '';
  alerts: SettlementAlert[] = [];
  loading = false;
  error: string | null = null;

  testCases = [
    { label: '🔴 Failed FX Leg (Critical)', prompt: 'A GBP/USD FX trade for GBP 1,500,000 (ref HSBC-FX-2026-001) was confirmed at 09:30 GMT. USD settlement expected by 10:00 GMT. Not received by 10:30 GMT.' },
    { label: '🟡 Cut-Off Miss (Medium)', prompt: 'A client submitted a GBP 250,000 withdrawal at 14:05 GMT. CHAPS cut-off was 14:00 GMT. Client submitted late.' },
    { label: '🟠 Unexpected Debit (High)', prompt: 'End of day reconciliation shows an unidentified GBP 85,000 debit. No matching instruction in system.' },
    { label: '🟠 Currency Mismatch (High)', prompt: 'Client instructed GBP to EUR conversion. Expected EUR 580,000. Received USD 580,000 instead. Financial impact GBP 12,000.' },
    { label: '🟢 Low Value Timing (Low)', prompt: 'Account balance is GBP 450 below expected. Suspected overnight interest timing difference.' }
  ];

  constructor(private lyzr: LyzrAgentService) {}

  analyseException() {
    this.loading = true;
    this.error = null;
    this.lyzr.callAgent(environment.agents['settlement'], this.exceptionInput).subscribe({
      next: (res) => {
        const parsed = this.lyzr.parseJSON<SettlementAlert>(res);
        if (parsed) {
          this.alerts = [parsed, ...this.alerts];
        } else {
          this.alerts = [{
            event_type: 'Analysis',
            summary: res.response,
            severity: 'low',
            currency_pair: '',
            amount: 0,
            base_currency: '',
            timeline: '',
            recommended_action: '',
            resolution_status: 'pending',
            escalate_to: []
          } as any, ...this.alerts];
        }
        this.loading = false;
      },
      error: (err: any) => { this.error = err.message || 'Unable to analyse the exception. Please try again.'; this.loading = false; }
    });
  }

  runTest(t: { label: string; prompt: string }) {
    this.exceptionInput = t.prompt;
    this.analyseException();
  }
}
