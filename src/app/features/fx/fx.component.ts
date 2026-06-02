import { Component } from '@angular/core';
import { LyzrAgentService } from '../../core/services/lyzr-agent.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-fx',
  template: `
    <div class="page">
      <div class="page-header">
        <h1>FX Pricing Monitor</h1>
        <p class="subtitle">Monitor HSBC FX spreads and market competitiveness</p>
      </div>
      <div class="input-card">
        <h2>Check FX Rate</h2>
        <div class="input-row">
          <input [(ngModel)]="pair" placeholder="Currency pair e.g. GBP/USD" />
          <input [(ngModel)]="quotedRate" placeholder="HSBC quoted rate e.g. 1.2618" />
          <button (click)="check()" [disabled]="loading || !pair">{{ loading ? '...' : 'Check' }}</button>
        </div>
      </div>
      <div class="quick-buttons">
        <button *ngFor="let p of pairs" (click)="quickCheck(p)" class="btn-pair">{{ p }}</button>
      </div>
      <div *ngIf="loading" class="loading"><div class="spinner"></div></div>
      <div *ngIf="error" class="error-bar">{{ error }}</div>
      <div *ngIf="response" class="response-card"><pre class="response-body">{{ response }}</pre></div>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 900px; }
    .page-header { margin-bottom: 24px; }
    h1 { font-size: 22px; color: #1a3a5c; margin: 0 0 4px; }
    h2 { font-size: 15px; color: #1a3a5c; margin: 0 0 12px; }
    .subtitle { color: #6b7280; font-size: 13px; margin: 0; }
    .input-card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .input-row { display: flex; gap: 10px; }
    input { flex: 1; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; }
    button { background: #1a3a5c; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    button:disabled { opacity: 0.5; }
    .quick-buttons { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
    .btn-pair { background: white; border: 1px solid #e5e7eb; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; color: #1a3a5c; }
    .loading { display: flex; align-items: center; padding: 16px; }
    .spinner { width: 18px; height: 18px; border: 3px solid #e5e7eb; border-top-color: #2e75b6; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-bar { background: #fef2f2; color: #dc2626; padding: 10px; border-radius: 6px; font-size: 13px; }
    .response-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .response-body { white-space: pre-wrap; font-family: Arial; font-size: 13px; color: #374151; line-height: 1.6; margin: 0; }
  `]
})
export class FxComponent {
  pair = ''; quotedRate = ''; response = ''; loading = false; error: string | null = null;
  pairs = ['GBP/USD', 'GBP/EUR', 'EUR/USD', 'GBP/CHF', 'GBP/JPY'];
  constructor(private lyzr: LyzrAgentService) {}
  check() {
    this.loading = true; this.error = null;
    const msg = this.quotedRate
      ? `The HSBC quoted ${this.pair} rate is ${this.quotedRate}. Search for current market mid rate and assess competitiveness. Classify impact.`
      : `Search for current ${this.pair} market rate and assess HSBC FX service competitiveness.`;
    this.lyzr.callAgent(environment.agents['fx'], msg).subscribe({
      next: (res) => { this.response = res.response; this.loading = false; },
      error: () => { this.error = 'Failed to connect to FX Agent.'; this.loading = false; }
    });
  }
  quickCheck(p: string) { this.pair = p; this.quotedRate = ''; this.check(); }
}
