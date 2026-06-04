import { Component } from '@angular/core';
import { LyzrAgentService } from '../../core/services/lyzr-agent.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-regulatory',
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Regulatory Monitor</h1>
        <p class="subtitle">FCA EMI | PCI-DSS | EU PSD3 | US Durbin | Multi-jurisdictional compliance</p>
      </div>
      <div class="input-card">
        <div class="input-row">
          <input [(ngModel)]="displayQuery" placeholder="Ask about regulations e.g. 'Latest FCA EMI updates 2026'" (keyup.enter)="searchFreeText()" />
          <button (click)="searchFreeText()" [disabled]="loading || !displayQuery">{{ loading ? '...' : 'Search' }}</button>
        </div>
      </div>
      <div class="quick-buttons">
        <button (click)="quickSearch('FCA EMI 2026', 'FCA Electronic Money Institution')" class="btn-q">FCA EMI 2026</button>
        <button (click)="quickSearch('PCI-DSS', 'PCI-DSS card issuer')" class="btn-q">PCI-DSS</button>
        <button (click)="quickSearch('EU PSD3', 'EU PSD3 prepaid card')" class="btn-q">EU PSD3</button>
        <button (click)="quickSearch('US Durbin', 'US Durbin prepaid debit')" class="btn-q">US Durbin</button>
      </div>
      <div *ngIf="loading" class="loading"><div class="spinner"></div> Searching regulatory updates...</div>
      <div *ngIf="error" class="error-bar">⚠ {{ error }}</div>

      <!-- Structured card when JSON parsed -->
      <div *ngIf="parsed" class="reg-card">
        <div class="reg-card-header">
          <div class="reg-meta">
            <span class="regulator-badge">{{ parsed.regulator }}</span>
            <span class="jurisdiction">{{ parsed.jurisdiction }}</span>
            <span class="event-type">{{ parsed.event_type }}</span>
          </div>
          <div class="badges">
            <span class="badge impact" [class]="'impact-' + parsed.impact_level">{{ parsed.impact_level | uppercase }}</span>
            <span class="badge urgency" [class]="'urgency-' + parsed.urgency">{{ parsed.urgency | uppercase }}</span>
          </div>
        </div>

        <p class="summary">{{ parsed.summary }}</p>

        <div class="reg-grid">
          <div *ngIf="parsed.compliance_deadline" class="reg-field">
            <span class="field-label">Compliance Deadline</span>
            <span class="field-value deadline">{{ parsed.compliance_deadline }}</span>
          </div>
          <div *ngIf="parsed.source_reference" class="reg-field">
            <span class="field-label">Source</span>
            <span class="field-value">{{ parsed.source_reference }}</span>
          </div>
          <div *ngIf="parsed.confidence_score" class="reg-field">
            <span class="field-label">Confidence</span>
            <span class="field-value">{{ (parsed.confidence_score * 100).toFixed(0) }}%</span>
          </div>
        </div>

        <div *ngIf="parsed.affected_products?.length" class="tag-row">
          <span class="tag-label">Affected Products:</span>
          <span *ngFor="let p of parsed.affected_products" class="tag">{{ p }}</span>
        </div>

        <div *ngIf="parsed.recommended_action" class="action-box">
          <span class="action-label">Recommended Action</span>
          <p class="action-text">{{ parsed.recommended_action }}</p>
        </div>

        <div *ngIf="parsed.notify?.length" class="tag-row">
          <span class="tag-label">Notify:</span>
          <span *ngFor="let n of parsed.notify" class="tag tag-notify">{{ n }}</span>
        </div>
      </div>

      <!-- Plain text fallback -->
      <div *ngIf="response && !parsed" class="response-card">
        <pre class="response-body">{{ response }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 900px; }
    .page-header { margin-bottom: 24px; }
    h1 { font-size: 22px; color: #1a3a5c; margin: 0 0 4px; }
    .subtitle { color: #6b7280; font-size: 13px; margin: 0; }
    .input-card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .input-row { display: flex; gap: 10px; }
    input { flex: 1; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; }
    button { background: #1a3a5c; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    button:disabled { opacity: 0.5; }
    .quick-buttons { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
    .btn-q { background: white; border: 1px solid #e5e7eb; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; color: #1a3a5c; }
    .btn-q:hover { background: #ebf3fa; }
    .loading { display: flex; align-items: center; padding: 16px; }
    .spinner { width: 18px; height: 18px; border: 3px solid #e5e7eb; border-top-color: #2e75b6; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-bar { background: #fef2f2; color: #dc2626; padding: 10px; border-radius: 6px; font-size: 13px; }

    .reg-card { background: white; border-radius: 10px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); border-left: 4px solid #2e75b6; }
    .reg-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
    .reg-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .regulator-badge { background: #1a3a5c; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; }
    .jurisdiction { color: #6b7280; font-size: 12px; }
    .event-type { color: #6b7280; font-size: 12px; background: #f3f4f6; padding: 3px 8px; border-radius: 4px; }
    .badges { display: flex; gap: 6px; }
    .badge { padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; }
    .impact-critical { background: #fef2f2; color: #dc2626; }
    .impact-high { background: #fff7ed; color: #ea580c; }
    .impact-medium { background: #fffbeb; color: #d97706; }
    .impact-low { background: #f0fdf4; color: #16a34a; }
    .urgency-urgent { background: #fef2f2; color: #dc2626; }
    .urgency-high { background: #fff7ed; color: #ea580c; }
    .urgency-medium { background: #fffbeb; color: #d97706; }
    .urgency-low { background: #f0fdf4; color: #16a34a; }

    .summary { font-size: 14px; color: #374151; line-height: 1.6; margin: 0 0 20px; }

    .reg-grid { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 16px; }
    .reg-field { display: flex; flex-direction: column; gap: 3px; }
    .field-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; font-weight: 600; }
    .field-value { font-size: 13px; color: #374151; font-weight: 500; }
    .deadline { color: #dc2626; font-weight: 700; }

    .tag-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .tag-label { font-size: 12px; color: #6b7280; font-weight: 600; }
    .tag { background: #e0e7ff; color: #3730a3; padding: 3px 10px; border-radius: 12px; font-size: 12px; }
    .tag-notify { background: #fce7f3; color: #9d174d; }

    .action-box { background: #f0f7ff; border-left: 3px solid #2e75b6; border-radius: 0 6px 6px 0; padding: 14px; margin-bottom: 14px; }
    .action-label { font-size: 11px; color: #2e75b6; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 6px; }
    .action-text { font-size: 13px; color: #374151; line-height: 1.6; margin: 0; }

    .response-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .response-body { white-space: pre-wrap; font-family: Arial; font-size: 13px; color: #374151; line-height: 1.6; margin: 0; }
  `]
})
export class RegulatoryComponent {
  displayQuery = ''; response = ''; parsed: any = null; loading = false; error: string | null = null;
  constructor(private lyzr: LyzrAgentService) {}

  private runSearch(apiPrompt: string) {
    this.loading = true; this.error = null; this.parsed = null; this.response = '';
    this.lyzr.callAgent(environment.agents['regulatory'], apiPrompt).subscribe({
      next: (res) => {
        this.parsed = this.lyzr.parseJSON<any>(res);
        if (!this.parsed) this.response = res.response;
        this.loading = false;
      },
      error: (err: any) => { this.error = err.message || 'Unable to load regulatory data. Please try again.'; this.loading = false; }
    });
  }

  searchFreeText() {
    if (!this.displayQuery.trim()) return;
    this.runSearch(`${this.displayQuery}. Return Regulatory_Update JSON.`);
  }

  quickSearch(label: string, topic: string) {
    this.displayQuery = label;
    this.runSearch(`Find the latest ${topic} regulatory updates in 2026. Classify urgency. Return Regulatory_Update JSON.`);
  }
}

@Component({
  selector: 'app-contracts',
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Contract Review</h1>
        <p class="subtitle">Partner bank contract and T&amp;C change analysis</p>
      </div>
      <div class="input-card">
        <div class="input-row">
          <input [(ngModel)]="query" placeholder="Ask about contracts e.g. 'What changed in HSBC agreement v2?'" (keyup.enter)="search()" />
          <button (click)="search()" [disabled]="loading || !query">{{ loading ? '...' : 'Review' }}</button>
        </div>
      </div>
      <div class="quick-buttons">
        <button (click)="quickSearch('HSBC v1 vs v2 all changes')" class="btn-q">HSBC All Changes</button>
        <button (click)="quickSearch('HSBC exclusive rate clause 3.1')" class="btn-q">Exclusive Rate</button>
        <button (click)="quickSearch('HSBC liability cap clause 6.1')" class="btn-q">Liability Cap</button>
        <button (click)="quickSearch('Barclays T&C March 2026')" class="btn-q">Barclays T&amp;C</button>
        <button (click)="quickSearch('most critical contract changes requiring immediate action')" class="btn-q">Critical Changes</button>
      </div>
      <div *ngIf="loading" class="loading"><div class="spinner"></div> Reviewing contract changes...</div>
      <div *ngIf="error" class="error-bar">⚠ {{ error }}</div>

      <!-- Structured card when JSON parsed -->
      <div *ngIf="parsed" class="contract-card" [class]="'severity-border-' + parsed.severity">
        <div class="card-header">
          <div class="card-meta">
            <span class="bank-badge">{{ parsed.bank_name }}</span>
            <span class="meta-tag">{{ parsed.contract_type }}</span>
            <span class="meta-tag">{{ parsed.change_type }}</span>
          </div>
          <span class="badge" [class]="'severity-' + parsed.severity">{{ parsed.severity | uppercase }}</span>
        </div>

        <div *ngIf="parsed.affected_clause" class="clause-ref">
          <span class="clause-label">Clause:</span> {{ parsed.affected_clause }}
        </div>

        <p class="summary">{{ parsed.change_summary }}</p>

        <div *ngIf="parsed.commercial_impact" class="impact-box">
          <span class="impact-label">Commercial Impact</span>
          <p class="impact-text">{{ parsed.commercial_impact }}</p>
        </div>

        <div class="card-grid">
          <div *ngIf="parsed.route_to" class="card-field">
            <span class="field-label">Route To</span>
            <span class="field-value route-tag">{{ parsed.route_to }}</span>
          </div>
          <div class="card-field">
            <span class="field-label">Client Impact</span>
            <span class="field-value" [style.color]="parsed.client_impact ? '#dc2626' : '#16a34a'">
              {{ parsed.client_impact ? 'Yes' : 'No' }}
            </span>
          </div>
          <div *ngIf="parsed.confidence_score" class="card-field">
            <span class="field-label">Confidence</span>
            <span class="field-value">{{ (parsed.confidence_score * 100).toFixed(0) }}%</span>
          </div>
        </div>

        <div *ngIf="parsed.recommended_action" class="action-box">
          <span class="action-label">Recommended Action</span>
          <p class="action-text">{{ parsed.recommended_action }}</p>
        </div>

        <div *ngIf="parsed.source_reference" class="source-ref">
          <span class="field-label">Source:</span> {{ parsed.source_reference }}
        </div>
      </div>

      <!-- Plain text fallback -->
      <div *ngIf="response && !parsed" class="response-card">
        <pre class="response-body">{{ response }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 900px; }
    .page-header { margin-bottom: 24px; }
    h1 { font-size: 22px; color: #1a3a5c; margin: 0 0 4px; }
    .subtitle { color: #6b7280; font-size: 13px; margin: 0; }
    .input-card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .input-row { display: flex; gap: 10px; }
    input { flex: 1; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; }
    button { background: #1a3a5c; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    button:disabled { opacity: 0.5; }
    .quick-buttons { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
    .btn-q { background: white; border: 1px solid #e5e7eb; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; color: #1a3a5c; }
    .btn-q:hover { background: #ebf3fa; }
    .loading { display: flex; align-items: center; padding: 16px; }
    .spinner { width: 18px; height: 18px; border: 3px solid #e5e7eb; border-top-color: #2e75b6; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-bar { background: #fef2f2; color: #dc2626; padding: 10px; border-radius: 6px; font-size: 13px; }

    .contract-card { background: white; border-radius: 10px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); border-left: 4px solid #6b7280; }
    .severity-border-critical { border-left-color: #dc2626; }
    .severity-border-high { border-left-color: #ea580c; }
    .severity-border-medium { border-left-color: #d97706; }
    .severity-border-low { border-left-color: #16a34a; }

    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
    .card-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .bank-badge { background: #1a3a5c; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; }
    .meta-tag { color: #6b7280; font-size: 12px; background: #f3f4f6; padding: 3px 8px; border-radius: 4px; }
    .badge { padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; }
    .severity-critical { background: #fef2f2; color: #dc2626; }
    .severity-high { background: #fff7ed; color: #ea580c; }
    .severity-medium { background: #fffbeb; color: #d97706; }
    .severity-low { background: #f0fdf4; color: #16a34a; }

    .clause-ref { font-size: 12px; color: #6b7280; margin-bottom: 12px; }
    .clause-label { font-weight: 600; color: #374151; }
    .summary { font-size: 14px; color: #374151; line-height: 1.6; margin: 0 0 16px; }

    .impact-box { background: #fffbeb; border-left: 3px solid #d97706; border-radius: 0 6px 6px 0; padding: 12px 14px; margin-bottom: 16px; }
    .impact-label { font-size: 11px; color: #d97706; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 4px; }
    .impact-text { font-size: 13px; color: #374151; line-height: 1.5; margin: 0; }

    .card-grid { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 16px; }
    .card-field { display: flex; flex-direction: column; gap: 3px; }
    .field-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; font-weight: 600; }
    .field-value { font-size: 13px; color: #374151; font-weight: 500; }
    .route-tag { background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 10px; font-size: 12px; display: inline-block; }

    .action-box { background: #f0f7ff; border-left: 3px solid #2e75b6; border-radius: 0 6px 6px 0; padding: 14px; margin-bottom: 14px; }
    .action-label { font-size: 11px; color: #2e75b6; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 6px; }
    .action-text { font-size: 13px; color: #374151; line-height: 1.6; margin: 0; }

    .source-ref { font-size: 11px; color: #9ca3af; margin-top: 8px; }

    .response-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .response-body { white-space: pre-wrap; font-family: Arial; font-size: 13px; color: #374151; line-height: 1.6; margin: 0; }
  `]
})
export class ContractsComponent {
  query = ''; response = ''; parsed: any = null; loading = false; error: string | null = null;
  constructor(private lyzr: LyzrAgentService) {}
  search() {
    this.loading = true; this.error = null; this.parsed = null; this.response = '';
    this.lyzr.callAgent(environment.agents['contracts'], this.query).subscribe({
      next: (res) => {
        this.parsed = this.lyzr.parseJSON<any>(res);
        if (!this.parsed) this.response = res.response;
        this.loading = false;
      },
      error: (err: any) => { this.error = err.message || 'Unable to load contract data. Please try again.'; this.loading = false; }
    });
  }
  quickSearch(q: string) { this.query = q; this.search(); }
}
