import { Component } from '@angular/core';
import { LyzrAgentService } from '../../core/services/lyzr-agent.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-scheme-compliance',
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Scheme Compliance Monitor</h1>
        <p class="subtitle">Visa | Mastercard | STAR Network | Principal Members | Impact Assessment</p>
      </div>

      <div class="input-card">
        <h2>Search Scheme Rules</h2>
        <div class="input-row">
          <input [(ngModel)]="displayQuery" placeholder="e.g. Latest Visa scheme rule changes affecting B4B 2026" (keyup.enter)="searchFreeText()" />
          <button (click)="searchFreeText()" [disabled]="loading || !displayQuery">{{ loading ? '...' : 'Search' }}</button>
        </div>
      </div>

      <div class="quick-section">
        <h2>Quick Scheme Check</h2>
        <div class="scheme-buttons">
          <button (click)="quickSearch('Visa Rules', 'Visa')" class="btn-scheme visa">💳 Visa Rules</button>
          <button (click)="quickSearch('Mastercard Rules', 'Mastercard')" class="btn-scheme mastercard">💳 Mastercard Rules</button>
          <button (click)="quickSearch('STAR Network', 'STAR Network')" class="btn-scheme star">⭐ STAR Network</button>
          <button (click)="quickSearch('Banking Circle', 'Banking Circle')" class="btn-scheme banking">🏦 Banking Circle</button>
          <button (click)="quickSearch('Thredd', 'Thredd')" class="btn-scheme thredd">🔗 Thredd</button>
          <button (click)="fullAssessment()" class="btn-scheme all">📋 Full Impact Assessment</button>
        </div>
      </div>

      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        <span>Searching scheme rules and generating compliance assessment...</span>
      </div>

      <div *ngIf="error" class="error-bar">⚠ {{ error }}</div>

      <!-- Structured card -->
      <div *ngIf="parsed" class="result-card" [class]="'border-' + parsed.severity?.toLowerCase()">
        <div class="card-header">
          <div class="header-left">
            <span class="scheme-badge">{{ parsed.scheme }}</span>
            <span class="alert-type">{{ parsed.alert_type }}</span>
            <span *ngIf="parsed.rule_reference && parsed.rule_reference !== 'N/A'" class="rule-ref">{{ parsed.rule_reference }}</span>
          </div>
          <span [class]="'severity-badge sev-' + parsed.severity?.toLowerCase()">{{ parsed.severity?.toUpperCase() }}</span>
        </div>

        <p class="summary">{{ parsed.summary }}</p>

        <div class="fields-grid">
          <div class="field-item" *ngIf="parsed.effective_date">
            <span class="field-label">Effective Date</span>
            <span class="field-value deadline">{{ parsed.effective_date }}</span>
          </div>
          <div class="field-item" *ngIf="parsed.implementation_effort">
            <span class="field-label">Implementation Effort</span>
            <span class="field-value" [class]="'effort-' + parsed.implementation_effort?.toLowerCase()">{{ parsed.implementation_effort | uppercase }}</span>
          </div>
          <div class="field-item" *ngIf="parsed.accountability">
            <span class="field-label">Accountability</span>
            <span class="field-value">{{ parsed.accountability }}</span>
          </div>
          <div class="field-item" *ngIf="parsed.confidence_score">
            <span class="field-label">Confidence</span>
            <span class="field-value">{{ (parsed.confidence_score * 100).toFixed(0) }}%</span>
          </div>
        </div>

        <div *ngIf="parsed.affected_products?.length" class="tag-row">
          <span class="tag-label">Affected Products:</span>
          <span *ngFor="let p of parsed.affected_products" class="tag">{{ p }}</span>
        </div>

        <div *ngIf="parsed.compliance_gap" class="assessment-box gap">
          <span class="box-label">Compliance Gap</span>
          <p>{{ parsed.compliance_gap }}</p>
        </div>
        <div *ngIf="parsed.implementation_required" class="assessment-box impl">
          <span class="box-label">Implementation Required</span>
          <p>{{ parsed.implementation_required }}</p>
        </div>
        <div *ngIf="parsed.risk_of_non_compliance" class="assessment-box risk">
          <span class="box-label">Risk of Non-Compliance</span>
          <p>{{ parsed.risk_of_non_compliance }}</p>
        </div>

        <div *ngIf="parsed.recommended_action" class="action-box">
          <span class="action-label">Recommended Action</span>
          <p>{{ parsed.recommended_action }}</p>
        </div>

        <div *ngIf="parsed.notify?.length" class="tag-row">
          <span class="tag-label">Notify:</span>
          <span *ngFor="let n of parsed.notify" class="tag tag-notify">{{ n }}</span>
        </div>

        <div class="card-footer">
          <a *ngIf="isUrl(parsed.source_reference)" [href]="parsed.source_reference" target="_blank" class="source-link">Source ↗</a>
          <span *ngIf="!isUrl(parsed.source_reference)" class="source-text">{{ parsed.source_reference }}</span>
        </div>
      </div>

      <!-- Plain text fallback -->
      <div *ngIf="response && !parsed" class="response-card">
        <pre class="response-body">{{ response }}</pre>
      </div>

      <!-- History -->
      <div *ngIf="alerts.length > 1" class="history">
        <h2>Previous Alerts ({{ alerts.length - 1 }})</h2>
        <div *ngFor="let a of alerts.slice(1)" class="history-item" [class]="'hist-' + a.severity?.toLowerCase()" (click)="viewAlert(a)">
          <span class="hist-scheme">{{ a.scheme }}</span>
          <span class="hist-type">{{ a.alert_type }}</span>
          <span [class]="'hist-sev sev-' + a.severity?.toLowerCase()">{{ a.severity }}</span>
          <span class="hist-date">{{ a.effective_date }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 960px; }
    .page-header { margin-bottom: 20px; }
    h1 { font-size: 22px; color: #1a3a5c; margin: 0 0 4px; }
    h2 { font-size: 15px; color: #1a3a5c; margin: 0 0 12px; }
    .subtitle { color: #6b7280; font-size: 13px; margin: 0; }

    .input-card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .input-row { display: flex; gap: 10px; }
    input { flex: 1; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; }
    input:focus { border-color: #2e75b6; outline: none; }
    button { background: #1a3a5c; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

    .quick-section { background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .scheme-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
    .btn-scheme { padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; border: 2px solid #e5e7eb; background: white; font-weight: 600; transition: all 0.2s; }
    .btn-scheme:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .visa { border-color: #1a1f71; color: #1a1f71; }
    .mastercard { border-color: #eb001b; color: #eb001b; }
    .star { border-color: #f79e1b; color: #92400e; }
    .banking { border-color: #1a3a5c; color: #1a3a5c; }
    .thredd { border-color: #6b7280; color: #374151; }
    .all { background: #1a3a5c; color: white; border-color: #1a3a5c; }

    .loading { display: flex; align-items: center; gap: 12px; padding: 20px; color: #6b7280; font-size: 13px; }
    .spinner { width: 20px; height: 20px; border: 3px solid #e5e7eb; border-top-color: #1a3a5c; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-bar { background: #fef2f2; color: #dc2626; padding: 12px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; }

    .result-card { background: white; border-radius: 10px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); border-left: 4px solid #e5e7eb; }
    .border-critical { border-left-color: #dc2626; }
    .border-high { border-left-color: #ea580c; }
    .border-medium { border-left-color: #d97706; }
    .border-low { border-left-color: #16a34a; }

    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
    .header-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .scheme-badge { background: #1a3a5c; color: white; padding: 4px 12px; border-radius: 4px; font-size: 13px; font-weight: 700; }
    .alert-type { color: #6b7280; font-size: 12px; background: #f3f4f6; padding: 3px 8px; border-radius: 4px; }
    .rule-ref { color: #2e75b6; font-size: 12px; font-weight: 600; }
    .severity-badge { padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 700; }
    .sev-critical { background: #fef2f2; color: #dc2626; }
    .sev-high { background: #fff7ed; color: #ea580c; }
    .sev-medium { background: #fffbeb; color: #d97706; }
    .sev-low { background: #f0fdf4; color: #16a34a; }

    .summary { font-size: 14px; color: #374151; line-height: 1.6; margin: 0 0 20px; }

    .fields-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .field-item { background: #f9fafb; border-radius: 6px; padding: 10px; }
    .field-label { display: block; font-size: 11px; color: #9ca3af; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
    .field-value { font-size: 14px; color: #1f2937; font-weight: 600; }
    .deadline { color: #dc2626; }
    .effort-low { color: #16a34a; }
    .effort-medium { color: #d97706; }
    .effort-high { color: #dc2626; }

    .tag-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .tag-label { font-size: 12px; color: #6b7280; font-weight: 600; }
    .tag { background: #e0e7ff; color: #3730a3; padding: 3px 10px; border-radius: 12px; font-size: 12px; }
    .tag-notify { background: #fce7f3; color: #9d174d; }

    .assessment-box { border-radius: 6px; padding: 14px; margin-bottom: 12px; }
    .assessment-box p { font-size: 13px; color: #374151; line-height: 1.5; margin: 0; }
    .box-label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; }
    .gap { background: #fef3c7; border-left: 3px solid #d97706; }
    .gap .box-label { color: #d97706; }
    .impl { background: #eff6ff; border-left: 3px solid #2563eb; }
    .impl .box-label { color: #2563eb; }
    .risk { background: #fef2f2; border-left: 3px solid #dc2626; }
    .risk .box-label { color: #dc2626; }

    .action-box { background: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 6px; padding: 14px; margin-bottom: 12px; }
    .action-label { display: block; font-size: 11px; color: #16a34a; text-transform: uppercase; font-weight: 700; margin-bottom: 6px; }
    .action-box p { font-size: 13px; color: #374151; line-height: 1.6; margin: 0; }

    .card-footer { display: flex; align-items: center; margin-top: 12px; }
    .source-link { color: #2563eb; font-size: 12px; text-decoration: none; }
    .source-link:hover { text-decoration: underline; }
    .source-text { font-size: 12px; color: #9ca3af; }

    .response-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .response-body { white-space: pre-wrap; font-family: Arial; font-size: 13px; color: #374151; line-height: 1.6; margin: 0; }

    .history { margin-top: 20px; }
    .history h2 { font-size: 15px; color: #1a3a5c; margin-bottom: 10px; }
    .history-item { background: white; border-radius: 6px; padding: 12px 16px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.06); border-left: 3px solid #e5e7eb; transition: all 0.2s; }
    .history-item:hover { box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
    .hist-critical { border-left-color: #dc2626; }
    .hist-high { border-left-color: #ea580c; }
    .hist-medium { border-left-color: #d97706; }
    .hist-scheme { font-weight: 700; color: #1a3a5c; font-size: 13px; min-width: 100px; }
    .hist-type { color: #6b7280; font-size: 12px; flex: 1; }
    .hist-sev { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
    .hist-date { font-size: 12px; color: #9ca3af; min-width: 90px; text-align: right; }
  `]
})
export class SchemeComplianceComponent {
  displayQuery = '';
  response = '';
  parsed: any = null;
  alerts: any[] = [];
  loading = false;
  error: string | null = null;

  constructor(private lyzr: LyzrAgentService) {}

  private runSearch(apiPrompt: string) {
    this.loading = true;
    this.error = null;
    this.parsed = null;
    this.response = '';
    this.lyzr.callAgent(environment.agents['schemeCompliance'], apiPrompt).subscribe({
      next: (res) => {
        const p = this.lyzr.parseJSON<any>(res);
        if (p) {
          this.parsed = p;
          this.alerts = [p, ...this.alerts];
        } else {
          this.response = res.response;
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.error = err.message || 'Unable to reach Scheme Compliance Agent. Please try again.';
        this.loading = false;
      }
    });
  }

  searchFreeText() {
    if (!this.displayQuery.trim()) return;
    this.runSearch(`${this.displayQuery}. Return Scheme_Compliance_Alert JSON.`);
  }

  quickSearch(label: string, scheme: string) {
    this.displayQuery = label;
    this.runSearch(`Find latest ${scheme} scheme rule changes and compliance updates in 2026 affecting B4B Payments card programmes. Return Scheme_Compliance_Alert JSON.`);
  }

  fullAssessment() {
    this.displayQuery = 'Full Impact Assessment';
    this.runSearch(`Generate a full scheme compliance impact assessment for B4B Payments covering Visa, Mastercard, and STAR Network rule changes in 2026. Return Scheme_Compliance_Alert JSON.`);
  }

  viewAlert(alert: any) {
    this.parsed = alert;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  isUrl(s: string): boolean {
    return s?.startsWith('http');
  }
}
