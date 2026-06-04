import { Component, OnInit } from '@angular/core';
import { LyzrAgentService } from '../../core/services/lyzr-agent.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Intelligence Dashboard</h1>
          <p class="subtitle">Panasa Intelligence Platform | Powered by Lyzr AI</p>
        </div>
        <button (click)="loadBriefing()" class="btn-primary" [disabled]="loading">
          {{ loading ? 'Loading...' : '↻ Morning Briefing' }}
        </button>
      </div>

      <!-- Stats Bar -->
      <div class="stats-bar">
        <div class="stat" [class.stat-danger]="criticalCount > 0">
          <span class="stat-num">{{ criticalCount }}</span>
          <span class="stat-label">Critical</span>
        </div>
        <div class="stat" [class.stat-warn]="highCount > 0">
          <span class="stat-num">{{ highCount }}</span>
          <span class="stat-label">High</span>
        </div>
        <div class="stat">
          <span class="stat-num">{{ alerts.length }}</span>
          <span class="stat-label">Total Alerts</span>
        </div>
        <div class="stat">
          <span class="stat-num">6</span>
          <span class="stat-label">Agents Active</span>
        </div>
      </div>

      <!-- Quick Ask Manager -->
      <div class="ask-section">
        <h2>Ask the Intelligence Platform</h2>
        <div class="ask-bar">
          <input [(ngModel)]="userQuery" placeholder="Ask anything — e.g. 'Any HSBC rate changes?' or 'Check GBP/USD spread'" (keyup.enter)="askManager()" />
          <button (click)="askManager()" [disabled]="asking || !userQuery">
            {{ asking ? 'Thinking...' : 'Ask →' }}
          </button>
        </div>
        <div *ngIf="managerResponse" class="manager-response">
          <div class="response-label">Manager Agent Response</div>
          <div class="response-body">{{ managerResponse }}</div>
        </div>
      </div>

      <!-- Quick Bank Buttons -->
      <div class="quick-section">
        <h2>Quick Bank Check</h2>
        <div class="bank-buttons">
          <button *ngFor="let bank of banks"
            (click)="checkBank(bank)"
            [disabled]="!!loadingBank"
            [class.btn-bank-loading]="loadingBank === bank"
            class="btn-bank">
            <span *ngIf="loadingBank === bank" class="btn-spinner"></span>
            {{ loadingBank === bank ? 'Checking ' + bank + '...' : bank }}
          </button>
        </div>
      </div>

      <!-- Bank loading progress bar -->
      <div *ngIf="loadingBank" class="bank-progress">
        <div class="bank-progress-bar"></div>
        <span>Fetching {{ loadingBank }} rate data...</span>
      </div>

      <!-- Error -->
      <div *ngIf="error" class="error-bar">
        ⚠ {{ error }} <button (click)="error = null">✕</button>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-bar">
        <div class="spinner"></div> Loading intelligence...
      </div>

      <!-- Alerts Feed -->
      <div class="alerts-section">
        <div class="section-header">
          <h2>Live Alerts</h2>
          <span class="badge-count">{{ alerts.length }}</span>
        </div>
        <app-alert-card *ngFor="let a of alerts" [alert]="a"></app-alert-card>
        <div *ngIf="alerts.length === 0 && !loading && !loadingBank" class="empty">
          Click "Morning Briefing" or search a bank to load alerts.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 1100px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    h1 { font-size: 24px; color: #1a3a5c; margin: 0 0 4px; }
    .subtitle { color: #6b7280; font-size: 13px; margin: 0; }
    .btn-primary { background: #1a3a5c; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; }
    .btn-primary:hover { background: #2e75b6; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .stats-bar { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .stat { background: white; border-radius: 8px; padding: 16px 24px; text-align: center; min-width: 100px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .stat-num { display: block; font-size: 28px; font-weight: 700; color: #1a3a5c; }
    .stat-label { display: block; font-size: 12px; color: #6b7280; margin-top: 2px; }
    .stat-danger .stat-num { color: #dc2626; }
    .stat-warn .stat-num { color: #ea580c; }

    .ask-section { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .ask-section h2 { font-size: 15px; color: #1a3a5c; margin: 0 0 12px; }
    .ask-bar { display: flex; gap: 10px; }
    .ask-bar input { flex: 1; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 14px; outline: none; }
    .ask-bar input:focus { border-color: #2e75b6; }
    .ask-bar button { background: #2e75b6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; white-space: nowrap; }
    .ask-bar button:disabled { opacity: 0.5; cursor: not-allowed; }
    .manager-response { margin-top: 14px; background: #f8fafc; border-radius: 6px; padding: 14px; border-left: 3px solid #2e75b6; }
    .response-label { font-size: 11px; color: #6b7280; margin-bottom: 6px; font-weight: 600; text-transform: uppercase; }
    .response-body { font-size: 13px; color: #374151; white-space: pre-wrap; line-height: 1.6; }

    .quick-section { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .quick-section h2 { font-size: 15px; color: #1a3a5c; margin: 0 0 12px; }
    .bank-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
    .btn-bank { background: white; border: 1px solid #e5e7eb; padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; color: #1a3a5c; font-weight: 500; transition: all 0.2s; }
    .btn-bank:hover { background: #ebf3fa; border-color: #2e75b6; }
    .btn-bank:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-bank-loading { background: #ebf3fa !important; border-color: #2e75b6 !important; color: #2e75b6 !important; display: flex; align-items: center; gap: 6px; }
    .btn-spinner { width: 10px; height: 10px; border: 2px solid #c7dff0; border-top-color: #2e75b6; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; flex-shrink: 0; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .bank-progress { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: #f0f7ff; border-radius: 6px; margin-bottom: 12px; font-size: 13px; color: #2e75b6; overflow: hidden; position: relative; }
    .bank-progress-bar { position: absolute; left: 0; top: 0; height: 3px; background: linear-gradient(90deg, #2e75b6, #60a5fa, #2e75b6); background-size: 200% 100%; animation: progress 1.5s ease-in-out infinite; width: 100%; }
    @keyframes progress { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .error-bar { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
    .error-bar button { background: none; border: none; cursor: pointer; color: #dc2626; font-size: 16px; }
    .loading-bar { display: flex; align-items: center; gap: 12px; padding: 20px; color: #6b7280; font-size: 14px; }
    .spinner { width: 20px; height: 20px; border: 3px solid #e5e7eb; border-top-color: #2e75b6; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .alerts-section { }
    .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .section-header h2 { font-size: 15px; color: #1a3a5c; margin: 0; }
    .badge-count { background: #e5e7eb; color: #374151; font-size: 12px; padding: 2px 8px; border-radius: 10px; }
    .empty { background: white; border-radius: 8px; padding: 32px; text-align: center; color: #9ca3af; font-size: 14px; }
  `]
})
export class DashboardComponent implements OnInit {
  alerts: any[] = [];
  loading = false;
  asking = false;
  loadingBank = '';
  error: string | null = null;
  userQuery = '';
  managerResponse = '';

  banks = ['HSBC', 'Barclays', 'NatWest', 'Lloyds', 'Santander', 'Halifax'];

  get criticalCount() { return this.alerts.filter(a => (a.impact_level || a.severity) === 'critical').length; }
  get highCount() { return this.alerts.filter(a => (a.impact_level || a.severity) === 'high').length; }

  constructor(private lyzr: LyzrAgentService) {}

  ngOnInit() {}

  loadBriefing() {
    this.loading = true;
    this.error = null;
    this.lyzr.callAgent(
      environment.agents['monitor'],
      'Compare all rate sheets. Detect all changes. Return Bank_Event_Notification JSON.',
      `morning-${new Date().toDateString()}`
    ).subscribe({
      next: (res) => {
        const parsed = this.lyzr.parseJSON<any>(res);
        if (parsed) {
          this.alerts = [parsed, ...this.alerts];
        } else {
          this.alerts = [{
            bank_name: 'Morning Briefing',
            summary: res.response,
            impact_level: 'medium',
            event_type: 'briefing',
            recommended_action: '',
            confidence_score: 0.9
          }, ...this.alerts];
        }
        this.loading = false;
      },
      error: (err: any) => { this.error = err.message || 'Unable to load morning briefing. Please try again.'; this.loading = false; }
    });
  }

  checkBank(bank: string) {
    this.loadingBank = bank;
    this.lyzr.callAgent(
      environment.agents['monitor'],
      `Search for latest ${bank} UK rate changes in 2026. Return Bank_Event_Notification JSON.`
    ).subscribe({
      next: (res) => {
        const parsed = this.lyzr.parseJSON<any>(res);
        if (parsed) {
          this.alerts = [parsed, ...this.alerts];
        } else {
          this.alerts = [{
            bank_name: bank,
            summary: res.response,
            impact_level: 'low',
            event_type: 'rate changes',
            recommended_action: '',
            confidence_score: 0.8
          }, ...this.alerts];
        }
        this.loadingBank = '';
        setTimeout(() => document.querySelector('.alerts-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
      },
      error: (err: any) => {
        this.alerts = [{
          bank_name: bank,
          summary: err.message || 'Unable to fetch rate data. Please try again.',
          impact_level: 'low',
          event_type: 'error',
          recommended_action: '',
          confidence_score: 0
        }, ...this.alerts];
        this.loadingBank = '';
        setTimeout(() => document.querySelector('.alerts-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    });
  }

  askManager() {
    if (!this.userQuery.trim()) return;
    this.asking = true;
    this.managerResponse = '';
    this.lyzr.callManager(this.userQuery).subscribe({
      next: (res) => {
        this.managerResponse = res.response;
        this.asking = false;
      },
      error: () => {
        this.managerResponse = 'Unable to get a response right now. Please try again.';
        this.asking = false;
      }
    });
  }
}
