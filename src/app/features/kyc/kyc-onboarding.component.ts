import { Component } from '@angular/core';
import { LyzrAgentService } from '../../core/services/lyzr-agent.service';
import { DocQualityResult } from '../../core/models/models';
import { environment } from '../../../environments/environment';

interface DocSlot {
  id: string;
  label: string;
  hint: string;
  required: boolean;
  file: File | null;
  base64: string | null;
  mimeType: string | null;
  previewUrl: string | null;
  checking: boolean;
  result: DocQualityResult | null;
  error: string | null;
}

const QUALITY_PROMPT = (docType: string) => `
You are a KYC/KYB document quality inspector for a financial institution.
Analyse this ${docType} image strictly and return ONLY the following JSON — no other text:
{
  "document_type": "${docType}",
  "overall_status": "pass",
  "checks": {
    "readable":    { "pass": true, "issue": "" },
    "genuine":     { "pass": true, "issue": "" },
    "complete":    { "pass": true, "issue": "" },
    "current":     { "pass": true, "issue": "" },
    "is_original": { "pass": true, "issue": "" }
  },
  "issues": [],
  "recommendation": "Document accepted for processing",
  "confidence_score": 0.95
}

Criteria:
- readable: Clear text, no blur / glare / dark shadows, all text legible
- genuine: No editing artefacts, consistent fonts/spacing, looks authentic
- complete: All four document corners visible, no cropping, no folded edges
- current: Not expired — check expiry/validity dates if shown; mark true for static company docs
- is_original: Not a screenshot, not a phone photo of a screen, not a photocopy of a photocopy
- overall_status: "pass" all checks pass | "review" one minor issue | "fail" any critical failure
`.trim();

@Component({
  selector: 'app-kyc-onboarding',
  template: `
<div class="page">

  <!-- Header -->
  <div class="page-header">
    <div class="header-top">
      <div>
        <h1>KYC / KYB Onboarding</h1>
        <p class="subtitle">Institutional client due diligence — document submission & quality pre-screen</p>
      </div>
      <div class="stage-pill">Stage 1 of 9</div>
    </div>
    <!-- Stage progress -->
    <div class="stage-bar">
      <div *ngFor="let s of stages; let i = index"
           class="stage-step" [class.active]="i === 0" [class.done]="i < 0">
        <div class="step-dot">{{ i + 1 }}</div>
        <span class="step-label">{{ s }}</span>
      </div>
    </div>
  </div>

  <!-- Company info -->
  <div class="section-card">
    <h2 class="section-title">Entity Details</h2>
    <div class="entity-row">
      <div class="field-group">
        <label>Company / Entity Name</label>
        <input [(ngModel)]="entityName" placeholder="e.g. Alpha Capital Holdings Ltd" />
      </div>
      <div class="field-group">
        <label>Jurisdiction</label>
        <input [(ngModel)]="jurisdiction" placeholder="e.g. England & Wales" />
      </div>
      <div class="field-group">
        <label>Entity Type</label>
        <select [(ngModel)]="entityType">
          <option value="">Select type</option>
          <option value="ltd">Private Limited Company</option>
          <option value="plc">Public Limited Company</option>
          <option value="llp">LLP</option>
          <option value="trust">Trust</option>
          <option value="partnership">Partnership</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Document upload grid -->
  <div class="section-card">
    <div class="section-header-row">
      <h2 class="section-title">Required Documents</h2>
      <span class="doc-count">{{ uploadedCount }} / {{ slots.length }} uploaded</span>
    </div>
    <p class="section-note">Upload clear, original documents. Accepted: PDF, JPG, PNG — max 10 MB each.</p>

    <div class="doc-grid">
      <div *ngFor="let slot of slots" class="doc-card"
           [class.has-file]="!!slot.file"
           [class.checking]="slot.checking"
           [class.result-pass]="slot.result?.overall_status === 'pass'"
           [class.result-review]="slot.result?.overall_status === 'review'"
           [class.result-fail]="slot.result?.overall_status === 'fail'">

        <!-- Hidden file input -->
        <input [id]="'file-' + slot.id" type="file" accept=".pdf,.jpg,.jpeg,.png"
               style="display:none" (change)="onFileSelected($event, slot)" />

        <!-- Drop zone -->
        <div class="drop-zone"
             (click)="triggerInput(slot.id)"
             (dragover)="$event.preventDefault()"
             (dragleave)="onDragLeave($event)"
             (dragenter)="onDragEnter($event)"
             (drop)="onDrop($event, slot)">

          <div *ngIf="!slot.file && !slot.checking" class="drop-content">
            <div class="doc-icon">📄</div>
            <div class="doc-label">{{ slot.label }}</div>
            <div class="doc-hint">{{ slot.hint }}</div>
            <div class="required-badge" *ngIf="slot.required">Required</div>
            <div class="upload-cta">Click or drag to upload</div>
          </div>

          <div *ngIf="slot.file && !slot.checking && !slot.result" class="file-ready">
            <div class="file-icon">{{ isImage(slot.mimeType) ? '🖼' : '📋' }}</div>
            <div class="file-name">{{ slot.file.name }}</div>
            <div class="file-size">{{ formatSize(slot.file.size) }}</div>
            <div class="doc-label-small">{{ slot.label }}</div>
            <button class="btn-check" (click)="$event.stopPropagation(); checkQuality(slot)">
              Check Quality
            </button>
            <button class="btn-remove" (click)="$event.stopPropagation(); removeFile(slot)">✕</button>
          </div>

          <div *ngIf="slot.checking" class="checking-state">
            <div class="spinner"></div>
            <div class="checking-label">Checking {{ slot.label }}…</div>
            <div class="checking-sub">AI quality pre-screen</div>
          </div>

          <div *ngIf="slot.result && !slot.checking" class="result-state">
            <div class="result-badge" [class]="'badge-' + slot.result.overall_status">
              {{ slot.result.overall_status === 'pass' ? '✓ PASS' :
                 slot.result.overall_status === 'review' ? '⚠ REVIEW' : '✗ FAIL' }}
            </div>
            <div class="doc-label-small">{{ slot.label }}</div>
            <div class="result-checks">
              <span *ngFor="let c of checkKeys" class="check-dot"
                    [class.dot-pass]="slot.result.checks[c].pass"
                    [class.dot-fail]="!slot.result.checks[c].pass"
                    [title]="checkLabel(c) + ': ' + (slot.result.checks[c].pass ? 'OK' : slot.result.checks[c].issue)">
                {{ slot.result.checks[c].pass ? '✓' : '✗' }}
              </span>
            </div>
            <div class="confidence">{{ (slot.result.confidence_score * 100).toFixed(0) }}% confidence</div>
            <button class="btn-recheck" (click)="$event.stopPropagation(); triggerInput(slot.id)">Replace</button>
          </div>
        </div>

        <!-- Expanded result detail -->
        <div *ngIf="slot.result && slot.result.overall_status !== 'pass'" class="result-detail">
          <div *ngFor="let key of checkKeys" class="check-row" [class.check-fail]="!slot.result.checks[key].pass">
            <span class="check-icon">{{ slot.result.checks[key].pass ? '✓' : '✗' }}</span>
            <span class="check-name">{{ checkLabel(key) }}</span>
            <span class="check-issue" *ngIf="!slot.result.checks[key].pass">{{ slot.result.checks[key].issue }}</span>
          </div>
          <div class="recommendation">💬 {{ slot.result.recommendation }}</div>
        </div>

        <div *ngIf="slot.error" class="slot-error">⚠ {{ slot.error }}</div>
      </div>
    </div>

    <!-- Check all button -->
    <div class="actions-row">
      <button class="btn-primary" (click)="checkAll()"
              [disabled]="uploadedCount === 0 || anyChecking">
        {{ anyChecking ? 'Checking documents…' : 'Check All Document Quality' }}
      </button>
      <button class="btn-secondary" (click)="resetAll()">Clear All</button>
      <span class="action-note" *ngIf="allPassed">✓ All documents passed — ready for Stage 2</span>
    </div>
  </div>

  <!-- Overall summary (after all checked) -->
  <div class="section-card summary-card" *ngIf="checkedCount > 0">
    <h2 class="section-title">Quality Pre-Screen Summary</h2>
    <div class="summary-row">
      <div class="summary-stat stat-pass">
        <div class="stat-num">{{ passCount }}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="summary-stat stat-review">
        <div class="stat-num">{{ reviewCount }}</div>
        <div class="stat-label">Needs Review</div>
      </div>
      <div class="summary-stat stat-fail">
        <div class="stat-num">{{ failCount }}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="summary-stat stat-pending">
        <div class="stat-num">{{ slots.length - checkedCount }}</div>
        <div class="stat-label">Pending</div>
      </div>
    </div>
    <div class="summary-message" *ngIf="failCount > 0">
      ✗ {{ failCount }} document(s) failed quality check. Please resubmit clear, original copies.
    </div>
    <div class="summary-message review-msg" *ngIf="failCount === 0 && reviewCount > 0">
      ⚠ {{ reviewCount }} document(s) flagged for manual review before proceeding.
    </div>
    <div class="summary-message pass-msg" *ngIf="allPassed">
      ✓ All {{ passCount }} documents passed quality pre-screen. Proceed to Stage 2 — Data Extraction.
    </div>
    <button class="btn-primary" *ngIf="allPassed" style="margin-top:16px">
      Proceed to Stage 2 → Data Extraction
    </button>
  </div>

</div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 1100px; margin: 0 auto; }
    .page-header { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; color: #1e3a5f; margin: 0 0 4px; }
    .subtitle { color: #64748b; font-size: 13px; margin: 0; }
    .stage-pill { background: #1e3a5f; color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; }

    .stage-bar { display: flex; gap: 4px; overflow-x: auto; padding-top: 8px; }
    .stage-step { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; min-width: 60px; opacity: 0.35; }
    .stage-step.active { opacity: 1; }
    .step-dot { width: 28px; height: 28px; border-radius: 50%; background: #e2e8f0; color: #64748b; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .stage-step.active .step-dot { background: #1e3a5f; color: white; }
    .step-label { font-size: 9px; color: #64748b; text-align: center; line-height: 1.2; }
    .stage-step.active .step-label { color: #1e3a5f; font-weight: 600; }

    .section-card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .section-title { font-size: 16px; font-weight: 600; color: #1e3a5f; margin: 0 0 16px; }
    .section-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .doc-count { font-size: 12px; color: #64748b; font-weight: 600; }
    .section-note { font-size: 12px; color: #94a3b8; margin: 0 0 16px; }

    .entity-row { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 16px; }
    .field-group { display: flex; flex-direction: column; gap: 6px; }
    .field-group label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .field-group input, .field-group select { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; color: #1e293b; outline: none; }
    .field-group input:focus, .field-group select:focus { border-color: #1e3a5f; }

    .doc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
    .doc-card { border-radius: 10px; border: 2px dashed #e2e8f0; transition: border-color 0.2s; position: relative; }
    .doc-card.has-file { border-style: solid; border-color: #cbd5e1; }
    .doc-card.result-pass { border-color: #22c55e; border-style: solid; }
    .doc-card.result-review { border-color: #f59e0b; border-style: solid; }
    .doc-card.result-fail { border-color: #ef4444; border-style: solid; }

    .drop-zone { padding: 20px 16px; min-height: 140px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 8px; }
    .drop-zone:hover { background: #f8fafc; }

    .drop-content { text-align: center; }
    .doc-icon { font-size: 28px; margin-bottom: 8px; }
    .doc-label { font-size: 12px; font-weight: 600; color: #1e3a5f; margin-bottom: 4px; }
    .doc-hint { font-size: 10px; color: #94a3b8; margin-bottom: 6px; }
    .required-badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-bottom: 6px; text-transform: uppercase; }
    .upload-cta { font-size: 11px; color: #94a3b8; }

    .file-ready { text-align: center; position: relative; width: 100%; }
    .file-icon { font-size: 28px; margin-bottom: 6px; }
    .file-name { font-size: 11px; color: #1e293b; font-weight: 600; word-break: break-all; margin-bottom: 2px; }
    .file-size { font-size: 10px; color: #94a3b8; margin-bottom: 6px; }
    .doc-label-small { font-size: 10px; color: #64748b; margin-bottom: 8px; font-weight: 600; }
    .btn-check { background: #1e3a5f; color: white; border: none; padding: 7px 14px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; }
    .btn-check:hover { background: #2d5a8e; }
    .btn-remove { position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; border: none; width: 20px; height: 20px; border-radius: 50%; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; }

    .checking-state { text-align: center; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #1e3a5f; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 10px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .checking-label { font-size: 12px; font-weight: 600; color: #1e3a5f; }
    .checking-sub { font-size: 10px; color: #94a3b8; margin-top: 4px; }

    .result-state { text-align: center; width: 100%; }
    .result-badge { display: inline-block; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 6px; }
    .badge-pass { background: #dcfce7; color: #166534; }
    .badge-review { background: #fef3c7; color: #92400e; }
    .badge-fail { background: #fee2e2; color: #991b1b; }
    .result-checks { display: flex; gap: 6px; justify-content: center; margin: 6px 0; }
    .check-dot { width: 20px; height: 20px; border-radius: 50%; font-size: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; cursor: help; }
    .dot-pass { background: #dcfce7; color: #166534; }
    .dot-fail { background: #fee2e2; color: #991b1b; }
    .confidence { font-size: 10px; color: #94a3b8; }
    .btn-recheck { background: none; border: 1px solid #cbd5e1; color: #64748b; padding: 4px 10px; border-radius: 5px; font-size: 10px; cursor: pointer; margin-top: 6px; }

    .result-detail { padding: 12px 14px; border-top: 1px solid #f1f5f9; }
    .check-row { display: flex; gap: 8px; align-items: flex-start; padding: 4px 0; font-size: 11px; }
    .check-row.check-fail { color: #991b1b; }
    .check-icon { flex-shrink: 0; font-weight: 700; }
    .check-name { flex-shrink: 0; font-weight: 600; min-width: 70px; }
    .check-issue { color: #64748b; font-style: italic; }
    .recommendation { margin-top: 8px; font-size: 11px; color: #1e3a5f; background: #f0f9ff; padding: 8px 10px; border-radius: 6px; border-left: 3px solid #0ea5e9; }

    .slot-error { padding: 8px 12px; background: #fee2e2; color: #991b1b; font-size: 11px; border-radius: 0 0 8px 8px; }

    .actions-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .btn-primary { background: #1e3a5f; color: white; border: none; padding: 11px 24px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-primary:hover:not(:disabled) { background: #2d5a8e; }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-secondary { background: white; color: #64748b; border: 1px solid #e2e8f0; padding: 11px 20px; border-radius: 8px; font-size: 13px; cursor: pointer; }
    .action-note { font-size: 12px; color: #16a34a; font-weight: 600; }

    .summary-card { }
    .summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
    .summary-stat { text-align: center; padding: 16px; border-radius: 8px; }
    .stat-pass { background: #dcfce7; }
    .stat-review { background: #fef3c7; }
    .stat-fail { background: #fee2e2; }
    .stat-pending { background: #f1f5f9; }
    .stat-num { font-size: 28px; font-weight: 700; }
    .stat-pass .stat-num { color: #166534; }
    .stat-review .stat-num { color: #92400e; }
    .stat-fail .stat-num { color: #991b1b; }
    .stat-pending .stat-num { color: #64748b; }
    .stat-label { font-size: 11px; font-weight: 600; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-message { padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; }
    .summary-message { background: #fee2e2; color: #991b1b; }
    .review-msg { background: #fef3c7; color: #92400e; }
    .pass-msg { background: #dcfce7; color: #166534; }
  `]
})
export class KycOnboardingComponent {

  entityName   = '';
  jurisdiction = '';
  entityType   = '';

  readonly stages = [
    'Documents', 'Quality', 'Extraction', 'Registry',
    'Identity', 'Sanctions', 'AML', 'Risk', 'Decision'
  ];

  readonly checkKeys: Array<keyof DocQualityResult['checks']> = [
    'readable', 'genuine', 'complete', 'current', 'is_original'
  ];

  slots: DocSlot[] = [
    { id: 'cert_inc',    label: 'Certificate of Incorporation', hint: 'Companies House certificate',            required: true,  file: null, base64: null, mimeType: null, previewUrl: null, checking: false, result: null, error: null },
    { id: 'dir_reg',     label: 'Register of Directors',        hint: 'Full names of all directors',           required: true,  file: null, base64: null, mimeType: null, previewUrl: null, checking: false, result: null, error: null },
    { id: 'ubo_reg',     label: 'Shareholders / UBO Register',  hint: 'Names + percentage shareholding',       required: true,  file: null, base64: null, mimeType: null, previewUrl: null, checking: false, result: null, error: null },
    { id: 'proof_addr',  label: 'Proof of Registered Address',  hint: 'Utility bill or bank statement < 3 mo', required: true,  file: null, base64: null, mimeType: null, previewUrl: null, checking: false, result: null, error: null },
    { id: 'dir_id',      label: 'Director ID Document',         hint: 'Passport or driving licence',           required: true,  file: null, base64: null, mimeType: null, previewUrl: null, checking: false, result: null, error: null },
    { id: 'sof_decl',    label: 'Source of Funds Declaration',  hint: 'Signed declaration or bank letter',     required: true,  file: null, base64: null, mimeType: null, previewUrl: null, checking: false, result: null, error: null }
  ];

  constructor(private lyzr: LyzrAgentService) {}

  // ── File handling ──────────────────────────────────────────────────────────

  triggerInput(slotId: string): void {
    (document.getElementById('file-' + slotId) as HTMLInputElement)?.click();
  }

  onFileSelected(event: Event, slot: DocSlot): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.loadFile(file, slot);
  }

  onDrop(event: DragEvent, slot: DocSlot): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.loadFile(file, slot);
  }

  onDragEnter(event: DragEvent): void { (event.currentTarget as HTMLElement).style.background = '#f0f9ff'; }
  onDragLeave(event: DragEvent): void { (event.currentTarget as HTMLElement).style.background = ''; }

  private loadFile(file: File, slot: DocSlot): void {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      slot.error = 'Unsupported format. Please upload PDF, JPG, or PNG.';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      slot.error = 'File too large. Maximum size is 10 MB.';
      return;
    }
    slot.error = null;
    slot.result = null;
    slot.file = file;
    slot.mimeType = file.type;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const dataUrl: string = e.target.result;
      slot.previewUrl = dataUrl;
      // Strip the data URL prefix to get raw base64
      slot.base64 = dataUrl.split(',')[1];
    };
    reader.readAsDataURL(file);
  }

  removeFile(slot: DocSlot): void {
    slot.file = null; slot.base64 = null; slot.mimeType = null;
    slot.previewUrl = null; slot.result = null; slot.error = null;
  }

  // ── Quality check ──────────────────────────────────────────────────────────

  checkQuality(slot: DocSlot): void {
    if (!slot.base64 || !slot.mimeType) return;
    slot.checking = true;
    slot.error = null;

    const prompt = QUALITY_PROMPT(slot.label);
    const agentId = environment.agents['kybKyc'];

    this.lyzr.callAgentWithDocument(agentId, prompt, slot.base64, slot.mimeType)
      .subscribe({
        next: (res) => {
          slot.checking = false;
          const parsed = this.lyzr.parseJSON<DocQualityResult>(res);
          if (parsed && parsed.overall_status) {
            slot.result = parsed;
          } else {
            // Fallback: treat raw text as a review result
            slot.result = {
              document_type: slot.label,
              overall_status: 'review',
              checks: {
                readable:    { pass: true,  issue: '' },
                genuine:     { pass: true,  issue: '' },
                complete:    { pass: true,  issue: '' },
                current:     { pass: true,  issue: '' },
                is_original: { pass: true,  issue: '' }
              },
              issues: ['Manual review required'],
              recommendation: res.response || 'Please review this document manually.',
              confidence_score: 0.5
            };
          }
        },
        error: (err: any) => {
          slot.checking = false;
          slot.error = err.message || 'Quality check failed. Please try again.';
        }
      });
  }

  checkAll(): void {
    this.slots.filter(s => s.file && s.base64 && !s.result).forEach(s => this.checkQuality(s));
  }

  resetAll(): void {
    this.slots.forEach(s => {
      s.file = null; s.base64 = null; s.mimeType = null;
      s.previewUrl = null; s.result = null; s.error = null; s.checking = false;
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  isImage(mime: string | null): boolean { return !!mime && mime.startsWith('image/'); }

  formatSize(bytes: number): string {
    return bytes > 1024 * 1024
      ? (bytes / 1024 / 1024).toFixed(1) + ' MB'
      : (bytes / 1024).toFixed(0) + ' KB';
  }

  checkLabel(key: string): string {
    const labels: Record<string, string> = {
      readable: 'Readable', genuine: 'Genuine',
      complete: 'Complete', current: 'Current', is_original: 'Original'
    };
    return labels[key] || key;
  }

  get uploadedCount(): number { return this.slots.filter(s => !!s.file).length; }
  get anyChecking():   boolean { return this.slots.some(s => s.checking); }
  get checkedCount():  number  { return this.slots.filter(s => !!s.result).length; }
  get passCount():     number  { return this.slots.filter(s => s.result?.overall_status === 'pass').length; }
  get reviewCount():   number  { return this.slots.filter(s => s.result?.overall_status === 'review').length; }
  get failCount():     number  { return this.slots.filter(s => s.result?.overall_status === 'fail').length; }
  get allPassed():     boolean { return this.checkedCount === this.slots.length && this.failCount === 0 && this.reviewCount === 0; }
}
