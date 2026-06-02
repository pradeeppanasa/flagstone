import { Component } from '@angular/core';
import { LyzrAgentService } from '../../core/services/lyzr-agent.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-onboarding',
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Institutional Onboarding</h1>
        <p class="subtitle">KYB verification, UBO identification, sanctions screening</p>
      </div>
      <div class="input-card">
        <h2>New Onboarding Case</h2>
        <div class="form-row">
          <input [(ngModel)]="entityName" placeholder="Entity name e.g. Alpha Capital Holdings Ltd" />
          <input [(ngModel)]="jurisdiction" placeholder="Jurisdiction e.g. Cayman Islands" />
        </div>
        <input [(ngModel)]="documents" placeholder="Documents provided (comma separated) e.g. Certificate of Incorporation, Register of Directors" style="width:100%;margin-bottom:10px;box-sizing:border-box;" />
        <button (click)="assess()" [disabled]="loading || !entityName">{{ loading ? 'Assessing...' : 'Assess Case' }}</button>
      </div>
      <div class="quick-tests">
        <h2>Quick Tests</h2>
        <button (click)="runTest('Alpha Capital Holdings Ltd', 'Cayman Islands', 'Certificate of Incorporation, Register of Directors')" class="btn-test">Alpha Capital (partial docs)</button>
        <button (click)="runTest('Barclays Bank PLC', 'United Kingdom', 'Full documentation provided')" class="btn-test">Barclays UK (Companies House)</button>
        <button (click)="runTest('Beta Fund Management Ltd', 'British Virgin Islands', 'Certificate of Incorporation only')" class="btn-test">Beta Fund BVI (high risk)</button>
      </div>
      <div *ngIf="loading" class="loading"><div class="spinner"></div> Assessing...</div>
      <div *ngIf="error" class="error-bar">{{ error }}</div>
      <div *ngIf="response" class="response-card">
        <div class="response-label">Onboarding Assessment</div>
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
    .form-row { display: flex; gap: 10px; margin-bottom: 10px; }
    input { flex: 1; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; }
    button { background: #1a3a5c; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    button:disabled { opacity: 0.5; }
    .quick-tests { background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; }
    .btn-test { background: #f3f4f6; border: 1px solid #e5e7eb; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; color: #374151; }
    .loading { display: flex; align-items: center; gap: 10px; padding: 16px; color: #6b7280; }
    .spinner { width: 18px; height: 18px; border: 3px solid #e5e7eb; border-top-color: #2e75b6; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-bar { background: #fef2f2; color: #dc2626; padding: 10px; border-radius: 6px; font-size: 13px; }
    .response-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .response-label { font-size: 11px; color: #6b7280; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; }
    .response-body { white-space: pre-wrap; font-family: Arial; font-size: 13px; color: #374151; line-height: 1.6; margin: 0; }
  `]
})
export class OnboardingComponent {
  entityName = ''; jurisdiction = ''; documents = '';
  response = ''; loading = false; error: string | null = null;
  constructor(private lyzr: LyzrAgentService) {}
  assess() {
    this.loading = true; this.error = null;
    const msg = `New institutional client onboarding. Entity: ${this.entityName}. Jurisdiction: ${this.jurisdiction}. Documents provided: ${this.documents || 'none'}. Assess onboarding status, identify missing documents, classify risk, and provide next steps.`;
    this.lyzr.callAgent(environment.agents['onboarding'], msg).subscribe({
      next: (res) => { this.response = res.response; this.loading = false; },
      error: () => { this.error = 'Failed to connect to Onboarding Agent.'; this.loading = false; }
    });
  }
  runTest(e: string, j: string, d: string) { this.entityName = e; this.jurisdiction = j; this.documents = d; this.assess(); }
}
