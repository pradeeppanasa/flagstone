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
      <div *ngIf="loading" class="loading"><div class="spinner"></div> Fetching live rate data...</div>
      <div *ngIf="error" class="error-bar">⚠ {{ error }}</div>

      <!-- Structured card when JSON parsed -->
      <div *ngIf="parsed" class="fx-card" [class]="'impact-border-' + parsed.impact_level">
        <div class="fx-header">
          <div class="fx-meta">
            <span class="pair-badge">{{ parsed.currency_pair }}</span>
            <span class="meta-tag">{{ parsed.bank_name || 'HSBC' }}</span>
            <span *ngIf="parsed.data_source" class="meta-tag">{{ parsed.data_source }}</span>
          </div>
          <div class="badges">
            <span class="badge" [class]="'impact-' + parsed.impact_level">{{ parsed.impact_level | uppercase }}</span>
            <span *ngIf="parsed.competitiveness" class="badge comp" [class]="'comp-' + parsed.competitiveness?.toLowerCase()">{{ parsed.competitiveness }}</span>
          </div>
        </div>

        <div class="rate-grid">
          <div class="rate-box">
            <span class="rate-label">HSBC Quoted</span>
            <span class="rate-value">{{ parsed.hsbc_rate || parsed.quoted_rate }}</span>
          </div>
          <div class="rate-box">
            <span class="rate-label">Market Mid Rate</span>
            <span class="rate-value">{{ parsed.market_rate || parsed.mid_rate }}</span>
          </div>
          <div *ngIf="parsed.spread_percentage || parsed.spread_pct" class="rate-box">
            <span class="rate-label">Spread</span>
            <span class="rate-value spread">{{ parsed.spread_percentage || parsed.spread_pct }}%</span>
          </div>
          <div *ngIf="parsed.confidence_score" class="rate-box">
            <span class="rate-label">Confidence</span>
            <span class="rate-value">{{ (parsed.confidence_score * 100).toFixed(0) }}%</span>
          </div>
        </div>

        <p *ngIf="parsed.summary" class="summary">{{ parsed.summary }}</p>

        <div *ngIf="parsed.recommended_action" class="action-box">
          <span class="action-label">Recommended Action</span>
          <p class="action-text">{{ parsed.recommended_action }}</p>
        </div>

        <div *ngIf="parsed.notify?.length" class="tag-row">
          <span class="tag-label">Notify:</span>
          <span *ngFor="let n of parsed.notify" class="tag">{{ n }}</span>
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

    .fx-card { background: white; border-radius: 10px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); border-left: 4px solid #6b7280; }
    .impact-border-critical { border-left-color: #dc2626; }
    .impact-border-high { border-left-color: #ea580c; }
    .impact-border-medium { border-left-color: #d97706; }
    .impact-border-low { border-left-color: #16a34a; }

    .fx-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
    .fx-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .pair-badge { background: #1a3a5c; color: white; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; }
    .meta-tag { color: #6b7280; font-size: 12px; background: #f3f4f6; padding: 3px 8px; border-radius: 4px; }
    .badges { display: flex; gap: 6px; align-items: center; }
    .badge { padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; }
    .impact-critical { background: #fef2f2; color: #dc2626; }
    .impact-high { background: #fff7ed; color: #ea580c; }
    .impact-medium { background: #fffbeb; color: #d97706; }
    .impact-low { background: #f0fdf4; color: #16a34a; }
    .comp { background: #e0e7ff; color: #3730a3; }

    .rate-grid { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
    .rate-box { background: #f8fafc; border-radius: 8px; padding: 14px 20px; min-width: 110px; text-align: center; }
    .rate-label { display: block; font-size: 11px; color: #9ca3af; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; }
    .rate-value { display: block; font-size: 22px; font-weight: 700; color: #1a3a5c; }
    .spread { color: #d97706; }

    .summary { font-size: 14px; color: #374151; line-height: 1.6; margin: 0 0 16px; }
    .action-box { background: #f0f7ff; border-left: 3px solid #2e75b6; border-radius: 0 6px 6px 0; padding: 14px; margin-bottom: 14px; }
    .action-label { font-size: 11px; color: #2e75b6; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 6px; }
    .action-text { font-size: 13px; color: #374151; line-height: 1.6; margin: 0; }
    .tag-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .tag-label { font-size: 12px; color: #6b7280; font-weight: 600; }
    .tag { background: #fce7f3; color: #9d174d; padding: 3px 10px; border-radius: 12px; font-size: 12px; }

    .response-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .response-body { white-space: pre-wrap; font-family: Arial; font-size: 13px; color: #374151; line-height: 1.6; margin: 0; }
  `]
})
export class FxComponent {
  pair = ''; quotedRate = ''; response = ''; parsed: any = null; loading = false; error: string | null = null;
  pairs = ['GBP/USD', 'GBP/EUR', 'EUR/USD', 'GBP/CHF', 'GBP/JPY'];
  constructor(private lyzr: LyzrAgentService) {}
  check() {
    this.loading = true;
    this.error = null;
    this.parsed = null;
    this.response = '';
    const msg = this.quotedRate
      ? `The HSBC quoted ${this.pair} rate is ${this.quotedRate}. Search for current ${this.pair.replace('/', ' to ')} market mid rate today. Calculate spread percentage. Classify competitiveness. Return FX_Pricing_Alert JSON.`
      : `Search for current ${this.pair.replace('/', ' to ')} exchange rate today and assess HSBC FX competitiveness.`;
    this.lyzr.callAgent(environment.agents['fx'], msg).subscribe({
      next: (res) => {
        this.parsed = this.lyzr.parseJSON<any>(res);
        if (!this.parsed) this.response = res.response;
        this.loading = false;
      },
      error: (err: any) => { this.error = err.message || 'Unable to fetch FX data. Please try again.'; this.loading = false; }
    });
  }
  quickCheck(p: string) {
    const defaultRates: Record<string, string> = {
      'GBP/USD': '1.2618',
      'GBP/EUR': '1.1685',
      'EUR/USD': '1.0756',
      'GBP/CHF': '1.1283',
      'GBP/JPY': '191.62'
    };
    this.pair = p;
    this.quotedRate = defaultRates[p] || '';
    this.check();
  }
}
