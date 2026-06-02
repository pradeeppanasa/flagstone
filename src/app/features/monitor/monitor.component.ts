import { Component } from '@angular/core';
import { LyzrAgentService } from '../../core/services/lyzr-agent.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-monitor',
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Partner Bank Rate Monitor</h1>
        <p class="subtitle">Monitor rate changes across 60+ partner banks</p>
      </div>
      <div class="input-card">
        <h2>Search Bank or Ask Question</h2>
        <div class="input-row">
          <input [(ngModel)]="query" placeholder="e.g. 'HSBC rate changes 2026' or 'Compare old and new rate sheets'" (keyup.enter)="search()" />
          <button (click)="search()" [disabled]="loading || !query">{{ loading ? '...' : 'Search' }}</button>
        </div>
      </div>
      <div class="quick-buttons">
        <button *ngFor="let b of banks" (click)="quickSearch(b)" class="btn-bank">{{ b }}</button>
        <button (click)="weeklyMI()" class="btn-mi">Weekly MI Summary</button>
      </div>
      <div *ngIf="loading" class="loading"><div class="spinner"></div> Searching...</div>
      <div *ngIf="error" class="error-bar">{{ error }}</div>
      <div *ngIf="response" class="response-card">
        <div class="response-label">Rate Monitor Response</div>
        <pre class="response-body">{{ response }}</pre>
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
    .input-row { display: flex; gap: 10px; }
    input { flex: 1; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; }
    button { background: #1a3a5c; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .quick-buttons { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
    .btn-bank { background: white; border: 1px solid #e5e7eb; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; color: #1a3a5c; }
    .btn-bank:hover { background: #ebf3fa; }
    .btn-mi { background: #1a3a5c; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .loading { display: flex; align-items: center; gap: 10px; padding: 16px; color: #6b7280; }
    .spinner { width: 18px; height: 18px; border: 3px solid #e5e7eb; border-top-color: #2e75b6; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-bar { background: #fef2f2; color: #dc2626; padding: 10px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; }
    .response-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .response-label { font-size: 11px; color: #6b7280; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; }
    .response-body { white-space: pre-wrap; font-family: Arial; font-size: 13px; color: #374151; line-height: 1.6; margin: 0; }
  `]
})
export class MonitorComponent {
  query = ''; response = ''; loading = false; error: string | null = null;
  banks = ['HSBC', 'Barclays', 'NatWest', 'Lloyds', 'Santander'];
  constructor(private lyzr: LyzrAgentService) {}
  search() {
    this.loading = true; this.error = null;
    this.lyzr.callAgent(environment.agents['monitor'], this.query).subscribe({
      next: (res) => { this.response = res.response; this.loading = false; },
      error: () => { this.error = 'Failed to connect.'; this.loading = false; }
    });
  }
  quickSearch(bank: string) { this.query = `Search for latest ${bank} UK rate changes 2026 and classify business impact`; this.search(); }
  weeklyMI() { this.query = 'Generate weekly MI summary covering all rate changes and external news this week'; this.search(); }
}
