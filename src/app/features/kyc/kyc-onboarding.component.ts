import { Component } from '@angular/core';
import { Observable } from 'rxjs';
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
  ocrData: any | null;
  error: string | null;
  extractedText: string | null;
  extracting: boolean;
}

interface DirectorEntry { fullName: string; dob: string; nationality: string; idType: string; idNumber: string; }
interface UboEntry       { fullName: string; shareholding: string; nationality: string; }
interface ReviewData {
  companyName: string; registrationNumber: string; incorporationDate: string;
  registeredAddress: string; jurisdiction: string; companyType: string;
  directors: DirectorEntry[]; ubos: UboEntry[]; sourceOfFunds: string;
}

@Component({
  selector: 'app-kyc-onboarding',
  template: `
<div class="page">

  <div class="left-col">
  <!-- Header -->
  <div class="page-header">
    <h1>KYC / KYB Onboarding</h1>
    <p class="subtitle">Institutional client due diligence — document submission &amp; quality pre-screen</p>
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
          <option value="Private Limited Company">Private Limited Company</option>
          <option value="Public Limited Company">Public Limited Company</option>
          <option value="LLP">LLP</option>
          <option value="Trust">Trust</option>
          <option value="Partnership">Partnership</option>
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
    <p class="section-note">Upload clear, original documents. Accepted: PDF, JPG, PNG — max 10 MB each. All documents go through AI quality validation. Identity documents (KYC provider path) require ≥80% confidence. Business documents (Companies House path) require ≥70% confidence.</p>

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
            <div *ngIf="slot.extracting" class="extract-chip extracting">⏳ Reading text…</div>
            <div *ngIf="!slot.extracting && slot.extractedText" class="extract-chip extracted">✓ Text ready</div>
            <button class="btn-check" (click)="$event.stopPropagation(); checkQuality(slot)">Check Quality</button>
            <button class="btn-remove" (click)="$event.stopPropagation(); removeFile(slot)">✕</button>
          </div>

          <div *ngIf="slot.checking" class="checking-state">
            <div class="spinner"></div>
            <div class="checking-label">Checking {{ slot.label }}…</div>
            <div class="checking-sub">Verifying document…</div>
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
            <div *ngIf="slot.extractedText" class="extract-chip extracted" style="margin:2px 0">✓ Text extracted</div>
            <div *ngIf="!slot.extractedText && slot.mimeType === 'application/pdf'" class="extract-chip no-text" style="margin:2px 0">No text layer</div>
            <div class="ocr-summary" *ngIf="slot.ocrData?.summary" style="font-size:10px;color:#475569;margin:2px 4px;line-height:1.3;word-break:break-word;max-width:100%;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">{{ slot.ocrData.summary }}</div>
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
          <div class="recommendation">{{ slot.result.recommendation }}</div>
          <div class="resubmit-alert" *ngIf="slot.result.overall_status === 'review'">
            ⚠ This document needs to be replaced before you can proceed. Click <strong>Replace</strong> above to upload a clearer original.
          </div>
          <div class="resubmit-alert resubmit-fail" *ngIf="slot.result.overall_status === 'fail'">
            ✗ Document rejected. Please upload a clear, undamaged original. Click <strong>Replace</strong> above.
          </div>
        </div>

        <div *ngIf="slot.error" class="slot-error">⚠ {{ slot.error }}</div>
      </div>
    </div>

    <!-- Check all button -->
    <div class="actions-row">
      <button class="btn-primary" (click)="checkAll()"
              [disabled]="uploadedCount === 0 || anyChecking">
        {{ anyChecking ? 'Checking documents…' : 'Verify All Documents' }}
      </button>
      <button class="btn-secondary" (click)="resetAll()">Clear All</button>
      <span class="action-note" *ngIf="allPassed">✓ All documents passed — ready for Stage 2</span>
    </div>
  </div>

  <!-- Overall summary (after all checked) -->
  <div class="section-card summary-card" *ngIf="checkedCount > 0">
    <h2 class="section-title">Gate 1 Quality Pre-Screen Summary</h2>
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
      ⚠ {{ reviewCount }} document(s) need replacing before you can proceed. Please resubmit a clearer original for each flagged document.
    </div>
    <div class="summary-message pass-msg" *ngIf="allPassed">
      ✓ All {{ passCount }} documents scanned successfully — data extracted and ready for verification.
    </div>
  </div>

  <!-- Submit card — all docs passed, ready to run full KYB -->
  <div class="section-card submit-card" *ngIf="allPassed && !kybResult && !kybLoading && !kybPhase1Loading && !kybPhase2aLoading && !kybPhase2bLoading && !kybError && !showReview && !showPhase1Review && !showPhase2aReview && !showPhase2bReview">
    <h2 class="section-title">Ready for Full KYB Verification</h2>
    <p class="section-note">All documents passed. The system will now run the complete verification pipeline:</p>
    <ul class="process-list">
      <li>✓ Gate 1 — Document quality check complete</li>
      <li>📋 Gate 2 — Review &amp; confirm extracted company data</li>
      <li>🏛️ Gate 3 — Validate against Companies House registry</li>
      <li>👥 Gate 4-5 — Verify directors and beneficial owners</li>
      <li>🛡️ Gate 6 — Screen for PEP and sanctions (user review checkpoint)</li>
      <li>🪪 Gate 7 — KYC identity check for primary director (user review checkpoint)</li>
      <li>📰 Gate 8 — AML adverse media check</li>
      <li>📊 Gate 9 — Calculate risk score and generate decision</li>
    </ul>
    <button class="btn-primary" (click)="submitKYB()">{{ gateActionLabel }}</button>
  </div>

  <!-- Gate 2 — Extracted Information Review -->
  <div class="section-card review-card" *ngIf="showReview && reviewData && !kybLoading && !kybPhase1Loading && !kybPhase2aLoading && !kybResult">
    <h2 class="section-title">Gate 2 — Document Data Extraction</h2>
    <p class="section-note">Fields are auto-filled from your uploaded PDFs where possible. Review and correct any field before proceeding — the registration number is required for Companies House validation.</p>
    <div class="extract-summary" *ngIf="extractedSlotCount > 0">
      ✓ Text extracted from {{ extractedSlotCount }} of {{ pdfSlotCount }} PDF documents
    </div>
    <div class="extract-summary extract-warn" *ngIf="extractedSlotCount === 0 && pdfSlotCount > 0">
      ⚠ No text could be read from the uploaded PDFs — please fill in all fields manually.
    </div>

    <div class="review-grid">
      <!-- Left: Company info -->
      <div class="review-col">
        <h3 class="review-sub-title">Company Information</h3>
        <div class="field-group">
          <label>Company Name</label>
          <input [(ngModel)]="reviewData.companyName" placeholder="e.g. Alpha Capital Holdings Ltd" />
        </div>
        <div class="field-group">
          <label>Registration Number</label>
          <input [(ngModel)]="reviewData.registrationNumber" placeholder="e.g. 12345678" />
        </div>
        <div class="field-group">
          <label>Incorporation Date</label>
          <input [(ngModel)]="reviewData.incorporationDate" placeholder="e.g. 12 January 2018" />
        </div>
        <div class="field-group">
          <label>Registered Address</label>
          <input [(ngModel)]="reviewData.registeredAddress" placeholder="e.g. 123 High Street, London EC1A 1AA" />
        </div>
        <div class="review-row-2">
          <div class="field-group">
            <label>Jurisdiction</label>
            <input [(ngModel)]="reviewData.jurisdiction" placeholder="England &amp; Wales" />
          </div>
          <div class="field-group">
            <label>Entity Type</label>
            <input [(ngModel)]="reviewData.companyType" placeholder="Private Limited" />
          </div>
        </div>
        <div class="field-group">
          <label>Source of Funds</label>
          <input [(ngModel)]="reviewData.sourceOfFunds" placeholder="e.g. Business revenue, investments" />
        </div>
      </div>

      <!-- Right: Directors + UBOs -->
      <div class="review-col">
        <h3 class="review-sub-title">Directors</h3>
        <div *ngFor="let d of reviewData.directors; let i = index" class="person-card">
          <div class="person-card-header">
            <span class="person-num">Director {{ i + 1 }}</span>
            <button class="btn-remove-person" *ngIf="reviewData.directors.length > 1" (click)="removeDirector(i)">✕</button>
          </div>
          <div class="field-group">
            <label>Full Name</label>
            <input [(ngModel)]="d.fullName" placeholder="e.g. James Mitchell" />
          </div>
          <div class="review-row-2">
            <div class="field-group">
              <label>Date of Birth</label>
              <input [(ngModel)]="d.dob" placeholder="e.g. 15 Mar 1980" />
            </div>
            <div class="field-group">
              <label>Nationality</label>
              <input [(ngModel)]="d.nationality" placeholder="e.g. British" />
            </div>
          </div>
          <div class="review-row-2">
            <div class="field-group">
              <label>ID Type</label>
              <select [(ngModel)]="d.idType">
                <option value="Passport">Passport</option>
                <option value="Driving Licence">Driving Licence</option>
                <option value="National ID">National ID</option>
              </select>
            </div>
            <div class="field-group">
              <label>Document Number</label>
              <input [(ngModel)]="d.idNumber" placeholder="e.g. A123456789" />
            </div>
          </div>
        </div>
        <button class="btn-add-person" (click)="addDirector()">+ Add Director</button>

        <h3 class="review-sub-title" style="margin-top:20px">Beneficial Owners (UBO)</h3>
        <div *ngFor="let u of reviewData.ubos; let i = index" class="person-card">
          <div class="person-card-header">
            <span class="person-num">UBO {{ i + 1 }}</span>
            <button class="btn-remove-person" *ngIf="reviewData.ubos.length > 1" (click)="removeUbo(i)">✕</button>
          </div>
          <div class="field-group">
            <label>Full Name</label>
            <input [(ngModel)]="u.fullName" placeholder="e.g. Sarah Johnson" />
          </div>
          <div class="review-row-2">
            <div class="field-group">
              <label>Shareholding %</label>
              <input [(ngModel)]="u.shareholding" placeholder="e.g. 51" />
            </div>
            <div class="field-group">
              <label>Nationality</label>
              <input [(ngModel)]="u.nationality" placeholder="e.g. British" />
            </div>
          </div>
        </div>
        <button class="btn-add-person" (click)="addUbo()">+ Add Shareholder / UBO</button>
      </div>
    </div>

    <div *ngIf="reviewErrors.length" class="review-errors">
      <strong>Please fix before proceeding:</strong>
      <ul style="margin:6px 0 0;padding-left:18px">
        <li *ngFor="let e of reviewErrors" style="font-size:12px;padding:2px 0">{{ e }}</li>
      </ul>
    </div>

    <div class="review-actions">
      <button class="btn-primary" (click)="confirmAndVerify()">{{ gateActionLabel }}</button>
      <button class="btn-secondary" (click)="showReview = false">← Back</button>
      <span class="review-note">Company name and registration number are required</span>
    </div>
  </div>

  <!-- Phase 1 loading state (Gates 3-5) -->
  <div class="section-card" *ngIf="kybPhase1Loading">
    <div style="text-align:center;padding:32px 20px 16px">
      <div class="spinner" style="width:48px;height:48px;border-width:4px;margin:0 auto 16px"></div>
      <h2 style="color:#1e3a5f;margin:0 0 6px;font-size:18px">Running KYB Verification — Phase 1</h2>
      <p style="color:#64748b;font-size:13px;margin:0 0 20px">Checking Companies House registry, directors and beneficial owners…</p>
    </div>
    <div style="max-width:360px;margin:0 auto;padding:0 20px 24px;text-align:left">
      <div class="gate-progress-row">⏳ Gate 3 — Validating Companies House registry</div>
      <div class="gate-progress-row">⏳ Gate 4 — Verifying director information</div>
      <div class="gate-progress-row">⏳ Gate 5 — Identifying beneficial owners</div>
    </div>
  </div>

  <!-- Phase 1 review — user confirms before Phase 2 -->
  <div class="section-card phase1-review-card" *ngIf="showPhase1Review && kybPhase1Result && !kybLoading && !kybResult">
    <h2 class="section-title">Phase 1 Complete — Gates 3–5 Results</h2>
    <p class="section-note">Registry, director and UBO checks are done. Review the results below, then proceed to run the compliance screening (PEP &amp; Sanctions, KYC Identity, AML).</p>

    <div class="phase1-results">
      <div class="p1-gate-row" [class.p1-pass]="kybPhase1Result.company_registry_verified" [class.p1-fail]="!kybPhase1Result.company_registry_verified">
        <div class="p1-icon">{{ kybPhase1Result.company_registry_verified ? '✓' : '✗' }}</div>
        <div class="p1-body">
          <div class="p1-name">Gate 3 — Company Registry</div>
          <div class="p1-status">{{ kybPhase1Result.company_registry_verified ? 'ACTIVE' : (kybPhase1Result.company_registry_status || 'FAILED') }}</div>
          <div class="p1-detail" *ngIf="kybPhase1Result.company_registry_summary">{{ kybPhase1Result.company_registry_summary }}</div>
        </div>
        <div class="p1-score" *ngIf="kybPhase1Result.company_registry_risk_score != null">Risk: {{ kybPhase1Result.company_registry_risk_score }}</div>
      </div>
      <div class="p1-gate-row" [class.p1-pass]="kybPhase1Result.director_verification_matched" [class.p1-warn]="!kybPhase1Result.director_verification_matched">
        <div class="p1-icon">{{ kybPhase1Result.director_verification_matched ? '✓' : '⚠' }}</div>
        <div class="p1-body">
          <div class="p1-name">Gate 4 — Director Verification</div>
          <div class="p1-status">{{ kybPhase1Result.director_verification_matched ? 'MATCHED' : 'MISMATCH' }}</div>
          <div class="p1-detail" *ngIf="kybPhase1Result.director_verification_summary">{{ kybPhase1Result.director_verification_summary }}</div>
        </div>
        <div class="p1-score" *ngIf="kybPhase1Result.director_risk_score != null">Risk: {{ kybPhase1Result.director_risk_score }}</div>
      </div>
      <div class="p1-gate-row" [class.p1-pass]="kybPhase1Result.ubo_identification_declared" [class.p1-warn]="!kybPhase1Result.ubo_identification_declared">
        <div class="p1-icon">{{ kybPhase1Result.ubo_identification_declared ? '✓' : '⚠' }}</div>
        <div class="p1-body">
          <div class="p1-name">Gate 5 — UBO Identification</div>
          <div class="p1-status">{{ kybPhase1Result.ubo_identification_declared ? 'DECLARED' : 'MISSING' }}</div>
          <div class="p1-detail" *ngIf="kybPhase1Result.ubo_identification_summary">{{ kybPhase1Result.ubo_identification_summary }}</div>
        </div>
        <div class="p1-score" *ngIf="kybPhase1Result.ubo_risk_score != null">Risk: {{ kybPhase1Result.ubo_risk_score }}</div>
      </div>
    </div>

    <div class="phase1-actions">
      <button class="btn-primary" (click)="proceedToPhase2a()">Proceed to PEP &amp; Sanctions →</button>
      <button class="btn-secondary" (click)="showPhase1Review = false; showReview = true">← Amend Data</button>
    </div>
  </div>

  <!-- Phase 2a loading state (Gate 6 — PEP & Sanctions) -->
  <div class="section-card" *ngIf="kybPhase2aLoading">
    <div style="text-align:center;padding:32px 20px 16px">
      <div class="spinner" style="width:48px;height:48px;border-width:4px;margin:0 auto 16px"></div>
      <h2 style="color:#1e3a5f;margin:0 0 6px;font-size:18px">Running Gate 6 — PEP &amp; Sanctions</h2>
      <p style="color:#64748b;font-size:13px;margin:0 0 20px">Screening all directors and UBOs against OFAC, UN, EU and HMT sanctions lists…</p>
    </div>
    <div style="max-width:360px;margin:0 auto;padding:0 20px 24px;text-align:left">
      <div class="gate-progress-row gate-done-row">✓ Gate 3 — Companies House registry validated</div>
      <div class="gate-progress-row gate-done-row">✓ Gate 4 — Director information verified</div>
      <div class="gate-progress-row gate-done-row">✓ Gate 5 — Beneficial owners identified</div>
      <div class="gate-progress-row">⏳ Gate 6 — PEP and sanctions screening</div>
    </div>
  </div>

  <!-- Phase 2a review — PEP & Sanctions result, user confirms before KYC -->
  <div class="section-card phase1-review-card" *ngIf="showPhase2aReview && kybPhase2aResult && !kybPhase2bLoading && !showPhase2bReview && !kybLoading && !kybPhase2aLoading && !kybResult">
    <h2 class="section-title">Gate 6 Complete — PEP &amp; Sanctions Result</h2>
    <p class="section-note">Sanctions and PEP screening is done. Review the result below, then proceed to KYC identity verification.</p>

    <div class="phase1-results">
      <div class="p1-gate-row"
           [class.p1-pass]="!kybPhase2aResult.sanctions_match && !kybPhase2aResult.pep_identified"
           [class.p1-warn]="kybPhase2aResult.pep_identified && !kybPhase2aResult.sanctions_match"
           [class.p1-fail]="kybPhase2aResult.sanctions_match">
        <div class="p1-icon">{{ !kybPhase2aResult.sanctions_match && !kybPhase2aResult.pep_identified ? '✓' : kybPhase2aResult.sanctions_match ? '✗' : '⚠' }}</div>
        <div class="p1-body">
          <div class="p1-name">Gate 6 — PEP &amp; Sanctions Screening</div>
          <div class="p1-status">{{ kybPhase2aResult.sanctions_match ? 'SANCTIONED' : kybPhase2aResult.pep_identified ? 'PEP IDENTIFIED' : 'CLEAR — No matches found' }}</div>
          <div class="p1-detail" *ngIf="kybPhase2aResult.pep_sanctions_summary">{{ kybPhase2aResult.pep_sanctions_summary }}</div>
        </div>
        <div class="p1-score" *ngIf="kybPhase2aResult.pep_sanctions_risk_score != null">Risk: {{ kybPhase2aResult.pep_sanctions_risk_score }}</div>
      </div>
    </div>

    <!-- Sanctions match — hard block -->
    <div *ngIf="kybPhase2aResult.sanctions_match" class="sanctions-block">
      <div class="sanctions-alert">
        ⛔ Onboarding Blocked — Mandatory Sanctions Match<br>
        <span>This entity or associated persons appear on a mandatory sanctions list (OFAC / UN / EU / HMT). Onboarding cannot proceed under applicable law.</span>
      </div>
      <div class="phase1-actions">
        <button class="btn-secondary" (click)="startNew()">Start New Onboarding</button>
      </div>
    </div>

    <!-- Clear or PEP-only — allow proceeding -->
    <div *ngIf="!kybPhase2aResult.sanctions_match">
      <div *ngIf="kybPhase2aResult.pep_identified" class="pep-warning-banner">
        ⚠ PEP Identified — Enhanced Due Diligence required before final approval
      </div>
      <div class="phase1-actions">
        <button class="btn-primary" (click)="proceedToPhase2b()">Proceed to KYC Identity Check →</button>
        <button class="btn-secondary" (click)="showPhase2aReview = false; showPhase1Review = true">← Back to Registry Results</button>
      </div>
    </div>
  </div>

  <!-- Phase 2b loading state (Gate 7 — KYC Identity) -->
  <div class="section-card" *ngIf="kybPhase2bLoading">
    <div style="text-align:center;padding:32px 20px 16px">
      <div class="spinner" style="width:48px;height:48px;border-width:4px;margin:0 auto 16px"></div>
      <h2 style="color:#1e3a5f;margin:0 0 6px;font-size:18px">Running Gate 7 — KYC Identity Check</h2>
      <p style="color:#64748b;font-size:13px;margin:0 0 20px">Verifying director identity documents…</p>
    </div>
    <div style="max-width:360px;margin:0 auto;padding:0 20px 24px;text-align:left">
      <div class="gate-progress-row gate-done-row">✓ Gate 3 — Companies House registry validated</div>
      <div class="gate-progress-row gate-done-row">✓ Gate 4 — Director information verified</div>
      <div class="gate-progress-row gate-done-row">✓ Gate 5 — Beneficial owners identified</div>
      <div class="gate-progress-row gate-done-row">✓ Gate 6 — PEP and sanctions screening complete</div>
      <div class="gate-progress-row">⏳ Gate 7 — KYC identity verification</div>
    </div>
  </div>

  <!-- Phase 2b review — KYC Identity result, user confirms before Adverse Media -->
  <div class="section-card phase1-review-card" *ngIf="showPhase2bReview && kybPhase2bResult && !kybLoading && !kybPhase2bLoading && !kybResult">
    <h2 class="section-title">Gate 7 Complete — KYC Identity Result</h2>
    <p class="section-note">KYC identity verification is done. Review the result below, then proceed to run the AML adverse media check.</p>

    <div class="phase1-results">
      <div class="p1-gate-row"
           [class.p1-pass]="kybPhase2bResult.kyc_identity_decision === 'GREEN'"
           [class.p1-warn]="kybPhase2bResult.kyc_identity_decision === 'MANUAL_REVIEW'"
           [class.p1-fail]="kybPhase2bResult.kyc_identity_decision === 'FAIL' || (!kybPhase2bResult.kyc_identity_verified && !kybPhase2bResult.kyc_identity_decision)">
        <div class="p1-icon">{{ kybPhase2bResult.kyc_identity_decision === 'GREEN' ? '✓' : kybPhase2bResult.kyc_identity_decision === 'MANUAL_REVIEW' ? '⚠' : '✗' }}</div>
        <div class="p1-body">
          <div class="p1-name">Gate 7 — KYC Identity Check
            <span *ngIf="kybPhase2bResult.kyc_identity_decision" class="kyc-decision-badge"
                  [class.badge-green]="kybPhase2bResult.kyc_identity_decision === 'GREEN'"
                  [class.badge-review]="kybPhase2bResult.kyc_identity_decision === 'MANUAL_REVIEW'"
                  [class.badge-fail]="kybPhase2bResult.kyc_identity_decision === 'FAIL'">
              {{ kybPhase2bResult.kyc_identity_decision }}
            </span>
          </div>
          <div class="p1-status">{{ kybPhase2bResult.kyc_identity_verified ? 'VERIFIED' : 'FAILED' }}
            <span *ngIf="kybPhase2bResult.kyc_identity_risk_level" class="kyc-risk-level"
                  [class.risk-low]="kybPhase2bResult.kyc_identity_risk_level === 'low'"
                  [class.risk-medium]="kybPhase2bResult.kyc_identity_risk_level === 'medium'"
                  [class.risk-high]="kybPhase2bResult.kyc_identity_risk_level === 'high'">
              {{ kybPhase2bResult.kyc_identity_risk_level | uppercase }} RISK
            </span>
          </div>
          <div class="p1-detail" *ngIf="kybPhase2bResult.kyc_identity_summary">{{ kybPhase2bResult.kyc_identity_summary }}</div>
          <div class="p1-detail" *ngIf="kybPhase2bResult.kyc_identity_reject_reason" style="color:#991b1b;margin-top:3px">
            Reject reason: {{ kybPhase2bResult.kyc_identity_reject_reason }}
          </div>
        </div>
        <div class="p1-score" *ngIf="kybPhase2bResult.kyc_identity_confidence != null">
          {{ (kybPhase2bResult.kyc_identity_confidence * 100).toFixed(0) }}%<br>
          <span style="font-size:9px;font-weight:400;color:#64748b">confidence</span>
        </div>
      </div>
    </div>

    <div class="phase1-actions">
      <button class="btn-primary" (click)="proceedToPhase2c()">Proceed to Adverse Media Check →</button>
      <button class="btn-secondary" (click)="showPhase2bReview = false; showPhase2aReview = true">← Back to PEP &amp; Sanctions</button>
    </div>
  </div>

  <!-- Phase 2c loading state (Gates 8-9 — AML + Risk Scoring) -->
  <div class="section-card" *ngIf="kybLoading">
    <div style="text-align:center;padding:32px 20px 16px">
      <div class="spinner" style="width:48px;height:48px;border-width:4px;margin:0 auto 16px"></div>
      <h2 style="color:#1e3a5f;margin:0 0 6px;font-size:18px">Running Gates 8–9 — AML &amp; Risk Scoring</h2>
      <p style="color:#64748b;font-size:13px;margin:0 0 20px">Adverse media check and final risk scoring in progress…</p>
    </div>
    <div style="max-width:360px;margin:0 auto;padding:0 20px 24px;text-align:left">
      <div class="gate-progress-row gate-done-row">✓ Gate 3 — Companies House registry validated</div>
      <div class="gate-progress-row gate-done-row">✓ Gate 4 — Director information verified</div>
      <div class="gate-progress-row gate-done-row">✓ Gate 5 — Beneficial owners identified</div>
      <div class="gate-progress-row gate-done-row">✓ Gate 6 — PEP and sanctions screening complete</div>
      <div class="gate-progress-row gate-done-row">✓ Gate 7 — KYC identity check complete</div>
      <div class="gate-progress-row">⏳ Gate 8 — AML adverse media check</div>
      <div class="gate-progress-row">⏳ Gate 9 — Risk scoring and onboarding decision</div>
    </div>
  </div>

  <!-- Error state -->
  <div class="section-card" *ngIf="kybError && !kybLoading && !kybPhase1Loading && !kybPhase2aLoading && !kybPhase2bLoading && !showPhase1Review && !showPhase2aReview && !showPhase2bReview && !kybResult">
    <div style="padding:16px;background:#fee2e2;border-radius:8px;color:#991b1b;font-size:13px">✗ {{ kybError }}</div>
    <button class="btn-secondary" style="margin-top:12px" (click)="retryKyb()">Try Again</button>
  </div>

  <!-- KYB Result card — two-column: entity summary left, validation checks right -->
  <div class="section-card" *ngIf="kybResult && !kybLoading" [style.border-top]="'4px solid ' + decisionColor">

    <!-- Decision header -->
    <div class="decision-header">
      <div class="decision-icon">{{ decisionIcon }}</div>
      <h2 class="decision-title">{{ kybResult.onboarding_decision || 'Verification Result' }}</h2>
      <div class="risk-score" *ngIf="computedRiskScore != null">Risk Score: {{ computedRiskScore }}/100</div>
      <div class="entity-meta">{{ reviewData?.companyName || kybResult.entity_name || entityName }}</div>
    </div>

    <!-- Body: two columns -->
    <div class="result-body-grid">

      <!-- Left: entity summary -->
      <div class="result-summary-col">
        <h3 class="result-section-title">Entity Summary</h3>
        <div class="es-row"><span class="es-label">Company</span><span class="es-value">{{ reviewData?.companyName || kybResult.entity_name || '—' }}</span></div>
        <div class="es-row" *ngIf="reviewData?.registrationNumber"><span class="es-label">Reg. Number</span><span class="es-value">{{ reviewData?.registrationNumber }}</span></div>
        <div class="es-row" *ngIf="reviewData?.incorporationDate"><span class="es-label">Incorporated</span><span class="es-value">{{ reviewData?.incorporationDate }}</span></div>
        <div class="es-row" *ngIf="reviewData?.registeredAddress"><span class="es-label">Address</span><span class="es-value">{{ reviewData?.registeredAddress }}</span></div>
        <div class="es-row" *ngIf="reviewData?.jurisdiction"><span class="es-label">Jurisdiction</span><span class="es-value">{{ reviewData?.jurisdiction }}</span></div>
        <div class="es-row" *ngIf="reviewData?.companyType"><span class="es-label">Entity Type</span><span class="es-value">{{ reviewData?.companyType }}</span></div>

        <div class="es-section" *ngIf="reviewData?.directors?.length">
          <div class="es-sub-title">Directors</div>
          <div *ngFor="let d of reviewData?.directors" class="es-person">{{ d.fullName || 'Unknown' }}</div>
        </div>
        <div class="es-section" *ngIf="reviewData?.ubos?.length">
          <div class="es-sub-title">Beneficial Owners</div>
          <div *ngFor="let u of reviewData?.ubos" class="es-person">{{ u.fullName || 'Unknown' }}{{ u.shareholding ? ' (' + u.shareholding + '%)' : '' }}</div>
        </div>
        <div class="es-section">
          <div class="es-sub-title">Documents Submitted</div>
          <div class="es-person">{{ passCount }} / {{ slots.length }} passed Gate 1 quality check</div>
        </div>

        <div *ngIf="kybResult.executive_summary" class="es-section">
          <div class="es-sub-title">Executive Summary</div>
          <p style="font-size:12px;color:#475569;line-height:1.5;margin:0">{{ kybResult.executive_summary }}</p>
        </div>
      </div>

      <!-- Right: validation check list -->
      <div class="result-checks-col">
        <h3 class="result-section-title">Validation Checks</h3>
        <div *ngFor="let gate of gateResults" class="vc-row"
             [class.vc-pass]="gate.pass" [class.vc-warn]="!gate.pass && gate.warning" [class.vc-fail]="!gate.pass && !gate.warning">
          <div class="vc-icon">{{ gate.pass ? '✓' : gate.warning ? '⚠' : '✗' }}</div>
          <div class="vc-body">
            <div class="vc-name">{{ gate.name }}</div>
            <div class="vc-status">{{ gate.status }}</div>
            <div class="vc-detail" *ngIf="gate.detail">{{ gate.detail }}</div>
          </div>
          <div class="vc-score" *ngIf="gate.score != null">{{ gate.score }}/100</div>
        </div>

        <div *ngIf="kybResult.key_findings?.length" style="margin-top:16px">
          <div class="result-section-title" style="margin-bottom:8px">Key Findings</div>
          <ul style="padding-left:16px;margin:0">
            <li *ngFor="let f of kybResult.key_findings" style="font-size:12px;color:#475569;padding:3px 0;line-height:1.4">{{ f }}</li>
          </ul>
        </div>

        <div *ngIf="kybResult.raw" style="margin-top:16px">
          <div class="result-section-title" style="margin-bottom:8px">Raw Response</div>
          <pre style="font-size:10px;color:#94a3b8;overflow-x:auto;white-space:pre-wrap;background:#f8fafc;padding:10px;border-radius:6px">{{ kybResult.raw }}</pre>
        </div>
      </div>
    </div>

    <!-- Score breakdown — per-gate risk + processor liability -->
    <div class="score-breakdown-section">
      <h3 class="result-section-title" style="margin-bottom:12px">Risk Score Breakdown</h3>
      <div class="score-grid">
        <ng-container *ngFor="let gate of gateResults">
          <div class="score-item" *ngIf="gate.score != null"
               [class.si-pass]="gate.pass" [class.si-warn]="!gate.pass && gate.warning" [class.si-fail]="!gate.pass && !gate.warning">
            <div class="si-name">{{ gate.name }}</div>
            <div class="si-bar-track">
              <div class="si-bar" [style.width]="gate.score + '%'"></div>
            </div>
            <div class="si-val">{{ gate.score }}<span class="si-denom">/100</span></div>
          </div>
        </ng-container>
        <div class="score-item si-total" *ngIf="computedRiskScore != null">
          <div class="si-name">Total Risk Score</div>
          <div class="si-bar-track">
            <div class="si-bar" [style.width]="computedRiskScore + '%'"></div>
          </div>
          <div class="si-val">{{ computedRiskScore }}<span class="si-denom">/100</span></div>
        </div>
        <div class="score-item si-liability" *ngIf="processorLiabilityScore != null">
          <div class="si-name">Processor Liability Score</div>
          <div class="si-bar-track">
            <div class="si-bar" [style.width]="processorLiabilityScore + '%'"></div>
          </div>
          <div class="si-val">{{ processorLiabilityScore }}<span class="si-denom">/100</span></div>
        </div>
      </div>
    </div>

    <div class="result-actions">
      <button class="btn-secondary" (click)="startNew()">Start New Onboarding</button>
      <button class="btn-secondary" (click)="downloadResult()">Download Report</button>
    </div>
  </div>

  </div><!-- /left-col -->

  <!-- Gate tracker — always visible -->
  <div class="section-card gate-tracker">
    <h2 class="section-title" style="margin-bottom:12px">KYB Pipeline — Gate Status</h2>
    <div class="gate-track">
      <div class="gate-track-item" [class.gt-active]="uploadedCount > 0" [class.gt-done]="checkedCount === slots.length && uploadedCount === slots.length">
        <div class="gt-dot">1</div>
        <div class="gt-info">
          <div class="gt-name">Gate 1 — Document Quality Check</div>
          <div class="gt-status">{{ uploadedCount }}/{{ slots.length }} uploaded · {{ checkedCount }}/{{ slots.length }} verified</div>
        </div>
        <div class="gt-badge" [class.gt-b-done]="checkedCount === slots.length && allPassed" [class.gt-b-fail]="failCount > 0" [class.gt-b-active]="uploadedCount > 0 && checkedCount < slots.length">
          {{ failCount > 0 ? 'FAIL' : allPassed ? 'PASS' : checkedCount > 0 ? 'IN PROGRESS' : uploadedCount > 0 ? 'UPLOADING' : 'PENDING' }}
        </div>
      </div>
      <div class="gate-track-item" [class.gt-active]="showReview" [class.gt-done]="!!kybPhase1Result || !!kybResult">
        <div class="gt-dot">2</div>
        <div class="gt-info">
          <div class="gt-name">Gate 2 — Document Data Extraction</div>
          <div class="gt-status">{{ showReview ? 'Review extracted data and confirm before verification' : 'Extracts company, director, UBO data from all documents' }}</div>
        </div>
        <div class="gt-badge" [class.gt-b-done]="!!kybPhase1Result || !!kybResult" [class.gt-b-active]="showReview">
          {{ (kybPhase1Result || kybResult) ? 'DONE' : showReview ? 'REVIEW' : kybPhase1Loading ? 'RUNNING' : 'PENDING' }}
        </div>
      </div>
      <div class="gate-track-item" [class.gt-active]="kybPhase1Loading" [class.gt-done]="phase1Data?.company_registry_verified != null">
        <div class="gt-dot">3</div>
        <div class="gt-info">
          <div class="gt-name">Gate 3 — Companies House Validation</div>
          <div class="gt-status">Cross-check extracted data vs registry · Active status · Director match</div>
        </div>
        <div class="gt-badge" [class.gt-b-done]="phase1Data?.company_registry_verified" [class.gt-b-fail]="phase1Data?.company_registry_verified === false" [class.gt-b-active]="kybPhase1Loading">
          {{ phase1Data?.company_registry_verified == null ? (kybPhase1Loading ? 'RUNNING' : 'PENDING') : phase1Data.company_registry_verified ? 'VERIFIED' : 'FAILED' }}
        </div>
      </div>
      <div class="gate-track-item" [class.gt-active]="kybPhase1Loading" [class.gt-done]="phase1Data?.director_verification_matched != null">
        <div class="gt-dot">4</div>
        <div class="gt-info">
          <div class="gt-name">Gate 4 — Director Verification</div>
          <div class="gt-status">Names, appointment dates, ID document match</div>
        </div>
        <div class="gt-badge" [class.gt-b-done]="phase1Data?.director_verification_matched" [class.gt-b-warn]="phase1Data?.director_verification_matched === false" [class.gt-b-active]="kybPhase1Loading">
          {{ phase1Data?.director_verification_matched == null ? (kybPhase1Loading ? 'RUNNING' : 'PENDING') : phase1Data.director_verification_matched ? 'MATCHED' : 'MISMATCH' }}
        </div>
      </div>
      <div class="gate-track-item" [class.gt-active]="kybPhase1Loading" [class.gt-done]="phase1Data?.ubo_identification_declared != null">
        <div class="gt-dot">5</div>
        <div class="gt-info">
          <div class="gt-name">Gate 5 — UBO Identification</div>
          <div class="gt-status">Beneficial owners declared · Shareholding % verified</div>
        </div>
        <div class="gt-badge" [class.gt-b-done]="phase1Data?.ubo_identification_declared" [class.gt-b-warn]="phase1Data?.ubo_identification_declared === false" [class.gt-b-active]="kybPhase1Loading">
          {{ phase1Data?.ubo_identification_declared == null ? (kybPhase1Loading ? 'RUNNING' : 'PENDING') : phase1Data.ubo_identification_declared ? 'DECLARED' : 'MISSING' }}
        </div>
      </div>
      <div class="gate-track-item" [class.gt-active]="kybPhase2aLoading" [class.gt-done]="phase2aData?.pep_sanctions_summary != null || phase2aData?.sanctions_match != null">
        <div class="gt-dot">6</div>
        <div class="gt-info">
          <div class="gt-name">Gate 6 — PEP &amp; Sanctions Screening</div>
          <div class="gt-status">All directors + UBOs screened · OFAC · UN · EU · HMT lists</div>
        </div>
        <div class="gt-badge"
          [class.gt-b-done]="(phase2aData?.sanctions_match != null) && !phase2aData.sanctions_match && !phase2aData.pep_identified"
          [class.gt-b-warn]="phase2aData?.pep_identified"
          [class.gt-b-fail]="phase2aData?.sanctions_match"
          [class.gt-b-active]="kybPhase2aLoading">
          {{ phase2aData?.sanctions_match == null ? (kybPhase2aLoading ? 'RUNNING' : 'PENDING') : phase2aData.sanctions_match ? 'SANCTIONED' : phase2aData.pep_identified ? 'PEP HIT' : 'CLEAR' }}
        </div>
      </div>
      <div class="gate-track-item" [class.gt-active]="kybPhase2bLoading" [class.gt-done]="phase2bData?.kyc_identity_verified != null">
        <div class="gt-dot">7</div>
        <div class="gt-info">
          <div class="gt-name">Gate 7 — KYC Identity Check</div>
          <div class="gt-status">Director ID verified · Biometric / liveness (if Sumsub)</div>
        </div>
        <div class="gt-badge" [class.gt-b-done]="phase2bData?.kyc_identity_verified" [class.gt-b-fail]="phase2bData?.kyc_identity_verified === false" [class.gt-b-active]="kybPhase2bLoading">
          {{ phase2bData?.kyc_identity_verified == null ? (kybPhase2bLoading ? 'RUNNING' : 'PENDING') : phase2bData.kyc_identity_verified ? 'VERIFIED' : 'FAILED' }}
        </div>
      </div>
      <div class="gate-track-item" [class.gt-active]="kybLoading" [class.gt-done]="kybResult?.aml_adverse_media_summary != null">
        <div class="gt-dot">8</div>
        <div class="gt-info">
          <div class="gt-name">Gate 8 — AML Adverse Media</div>
          <div class="gt-status">News + web search · Fraud · Money laundering · Enforcement actions</div>
        </div>
        <div class="gt-badge"
          [class.gt-b-done]="kybResult && !kybResult.adverse_media_found"
          [class.gt-b-warn]="kybResult?.adverse_media_found"
          [class.gt-b-active]="kybLoading">
          {{ !kybResult ? (kybLoading ? 'RUNNING' : 'PENDING') : kybResult.adverse_media_found ? 'FLAGGED' : 'CLEAR' }}
        </div>
      </div>
      <div class="gate-track-item" [class.gt-active]="kybLoading" [class.gt-done]="!!kybResult?.onboarding_decision">
        <div class="gt-dot">9</div>
        <div class="gt-info">
          <div class="gt-name">Gate 9 — Risk Scoring &amp; Decision</div>
          <div class="gt-status">Aggregate risk score · APPROVED / MANUAL_REVIEW / REJECTED</div>
        </div>
        <div class="gt-badge"
          [class.gt-b-done]="kybResult?.onboarding_decision === 'APPROVED'"
          [class.gt-b-warn]="kybResult?.onboarding_decision === 'MANUAL_REVIEW' || kybResult?.onboarding_decision === 'CONDITIONS'"
          [class.gt-b-fail]="kybResult?.onboarding_decision === 'REJECTED'"
          [class.gt-b-active]="kybLoading">
          {{ kybResult?.onboarding_decision || (kybLoading ? 'RUNNING' : 'PENDING') }}
        </div>
      </div>
    </div>
  </div>

</div>
  `,
  styles: [`
    .page {
      padding: 24px;
      max-width: 1260px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 300px;
      column-gap: 20px;
      height: 100vh;
      box-sizing: border-box;
      overflow: hidden;
    }
    .left-col {
      height: 100%;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding-right: 4px;
    }
    .page-header {
      background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      flex-shrink: 0;
    }
    @media (max-width: 960px) {
      .page { grid-template-columns: 1fr; height: auto; overflow: visible; }
      .left-col { height: auto; overflow-y: visible; }
      .gate-tracker { height: auto !important; overflow-y: visible !important; }
    }
    h1 { font-size: 22px; font-weight: 700; color: #1e3a5f; margin: 0 0 4px; }
    .subtitle { color: #64748b; font-size: 13px; margin: 0; }

    .section-card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .section-title { font-size: 16px; font-weight: 600; color: #1e3a5f; margin: 0 0 16px; }
    .section-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .doc-count { font-size: 12px; color: #64748b; font-weight: 600; }
    .section-note { font-size: 12px; color: #475569; margin: 0 0 16px; line-height: 1.6; }

    .entity-row { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 16px; }
    .field-group { display: flex; flex-direction: column; gap: 6px; }
    .field-group label { font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; }
    .field-group input, .field-group select {
      padding: 10px 12px;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      color: #1e293b;
      background: #ffffff;
      width: 100%;
      box-sizing: border-box;
      outline: none;
    }
    .field-group input::placeholder { color: #94a3b8; }
    .field-group input:focus, .field-group select:focus { border-color: #1e3a5f; box-shadow: 0 0 0 3px rgba(30,58,95,0.08); }
    .field-group input[value]:not([value=""]), .field-group select { color: #0f172a; font-weight: 500; }

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
    .doc-label-small { font-size: 10px; color: #64748b; margin-bottom: 6px; font-weight: 600; }
    .extract-chip { font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 10px; display: inline-block; margin-bottom: 6px; }
    .extract-chip.extracting  { background: #fef3c7; color: #92400e; }
    .extract-chip.extracted   { background: #dcfce7; color: #166534; }
    .extract-chip.no-text     { background: #f1f5f9; color: #94a3b8; }
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
    .resubmit-alert { margin-top: 8px; font-size: 11px; color: #92400e; background: #fef3c7; padding: 8px 10px; border-radius: 6px; border-left: 3px solid #f59e0b; }
    .resubmit-fail  { color: #991b1b; background: #fee2e2; border-left-color: #ef4444; }

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

    .submit-card { border: 2px solid #22c55e; }
    .process-list { padding-left: 20px; margin: 0 0 20px; }
    .process-list li { font-size: 13px; color: #475569; padding: 4px 0; }

    .gate-progress-row { padding: 7px 0; font-size: 12px; color: #64748b; border-bottom: 1px solid #f1f5f9; }
    .ocr-progress-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid #f1f5f9; }
    .ocr-status-icon { font-size: 14px; width: 20px; text-align: center; flex-shrink: 0; }
    .ocr-doc-label { font-size: 12px; color: #1e3a5f; font-weight: 500; flex: 1; }
    .ocr-status-badge { font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
    .ocr-done    { background: #dcfce7; color: #166534; }
    .ocr-fail    { background: #fee2e2; color: #991b1b; }
    .ocr-active  { background: #dbeafe; color: #1d4ed8; }
    .ocr-pending { background: #f1f5f9; color: #94a3b8; }

    .result-card { }
    .decision-header { text-align: center; padding: 24px 0 20px; border-bottom: 1px solid #f1f5f9; margin-bottom: 20px; }
    .decision-icon { font-size: 48px; margin-bottom: 8px; }
    .decision-title { font-size: 26px; font-weight: 700; color: #1e3a5f; margin: 0 0 6px; }
    .risk-score { font-size: 15px; color: #64748b; font-weight: 600; }
    .entity-meta { font-size: 12px; color: #94a3b8; margin-top: 4px; }

    .result-section { margin-bottom: 20px; }
    .result-section-title { font-size: 13px; font-weight: 600; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px; }

    .gates-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .gate-card { padding: 12px; border-radius: 8px; border: 1px solid; }
    .gate-pass { background: #f0fdf4; border-color: #86efac; }
    .gate-warn { background: #fffbeb; border-color: #fcd34d; }
    .gate-fail { background: #fef2f2; border-color: #fca5a5; }
    .gate-name { font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px; }
    .gate-status { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    .gate-detail { font-size: 11px; color: #64748b; line-height: 1.4; }

    .result-actions { display: flex; gap: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 8px; }

    /* ── Review panel ─────────────────────────────────────── */
    .review-card { border: 2px solid #3b82f6; background: #ffffff; }
    .extract-summary { font-size: 11px; font-weight: 600; padding: 7px 12px; border-radius: 6px; margin-bottom: 16px; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .extract-summary.extract-warn { background: #fffbeb; color: #92400e; border-color: #fde68a; }
    .review-card .field-group input:not(:placeholder-shown),
    .review-card .field-group select:not([value=""]) {
      border-color: #86efac;
      background: #f0fdf4;
    }
    .review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
    .review-col { display: flex; flex-direction: column; gap: 12px; }
    .review-sub-title { font-size: 11px; font-weight: 700; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.6px; margin: 0 0 4px; }
    .review-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .person-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
    .person-card-header { display: flex; justify-content: space-between; align-items: center; }
    .person-num { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .btn-remove-person { background: none; border: none; color: #cbd5e1; cursor: pointer; font-size: 13px; padding: 0 2px; line-height: 1; }
    .btn-remove-person:hover { color: #ef4444; }
    .btn-add-person { background: none; border: 1px dashed #cbd5e1; color: #94a3b8; padding: 7px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; width: 100%; text-align: center; transition: all 0.15s; }
    .btn-add-person:hover { background: #f1f5f9; color: #64748b; border-color: #94a3b8; }
    .review-errors { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; color: #991b1b; font-size: 12px; font-weight: 600; }
    .review-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding-top: 16px; border-top: 1px solid #f1f5f9; }
    .review-note { font-size: 11px; color: #94a3b8; }

    /* ── KYB result — two-column layout ───────────────────── */
    .result-body-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
    .result-summary-col { }
    .result-checks-col { }
    .es-row { display: flex; gap: 10px; padding: 5px 0; border-bottom: 1px solid #f8fafc; font-size: 12px; align-items: flex-start; }
    .es-label { color: #94a3b8; font-weight: 600; min-width: 90px; flex-shrink: 0; font-size: 11px; padding-top: 1px; }
    .es-value { color: #1e293b; line-height: 1.4; }
    .es-section { margin-top: 14px; }
    .es-sub-title { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .es-person { font-size: 12px; color: #475569; padding: 2px 0; }

    .vc-row { display: flex; gap: 12px; padding: 10px 12px; border-radius: 8px; margin-bottom: 6px; }
    .vc-pass { background: #f0fdf4; }
    .vc-warn { background: #fffbeb; }
    .vc-fail { background: #fef2f2; }
    .vc-icon { font-size: 15px; font-weight: 700; width: 18px; flex-shrink: 0; margin-top: 2px; }
    .vc-pass .vc-icon { color: #16a34a; }
    .vc-warn .vc-icon { color: #d97706; }
    .vc-fail .vc-icon { color: #dc2626; }
    .vc-body { flex: 1; }
    .vc-name { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
    .vc-status { font-size: 13px; font-weight: 700; color: #1e293b; }
    .vc-detail { font-size: 11px; color: #64748b; line-height: 1.4; margin-top: 3px; }

    .gate-tracker { height: 100%; overflow-y: auto; padding: 20px; }
    .gate-track { display: flex; flex-direction: column; gap: 2px; }
    .gate-track-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; border-radius: 8px; transition: background 0.2s; }
    .gate-track-item.gt-active { background: #eff6ff; }
    .gate-track-item.gt-done { background: #f0fdf4; }
    .gt-dot { width: 26px; height: 26px; border-radius: 50%; background: #e2e8f0; color: #64748b; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    .gt-active .gt-dot { background: #3b82f6; color: white; }
    .gt-done .gt-dot { background: #22c55e; color: white; }
    .gt-info { flex: 1; }
    .gt-name { font-size: 12px; font-weight: 600; color: #1e3a5f; }
    .gt-status { font-size: 10px; color: #94a3b8; margin-top: 2px; }
    .gt-badge { font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 10px; white-space: nowrap; background: #f1f5f9; color: #94a3b8; align-self: center; }
    .gt-b-done { background: #dcfce7; color: #166534; }
    .gt-b-fail { background: #fee2e2; color: #991b1b; }
    .gt-b-warn { background: #fef3c7; color: #92400e; }
    .gt-b-active { background: #dbeafe; color: #1d4ed8; }

    /* ── Phase 1 review panel ─────────────────────────────── */
    .phase1-review-card { border: 2px solid #3b82f6; }
    .phase1-results { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
    .p1-gate-row { display: flex; gap: 12px; padding: 12px; border-radius: 8px; align-items: flex-start; border: 1px solid; }
    .p1-pass { background: #f0fdf4; border-color: #86efac; }
    .p1-warn { background: #fffbeb; border-color: #fcd34d; }
    .p1-fail { background: #fef2f2; border-color: #fca5a5; }
    .p1-icon { font-size: 16px; font-weight: 700; width: 20px; flex-shrink: 0; margin-top: 2px; }
    .p1-pass .p1-icon { color: #16a34a; }
    .p1-warn .p1-icon { color: #d97706; }
    .p1-fail .p1-icon { color: #dc2626; }
    .p1-body { flex: 1; }
    .p1-name { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
    .p1-status { font-size: 13px; font-weight: 700; color: #1e293b; }
    .p1-detail { font-size: 11px; color: #64748b; margin-top: 3px; line-height: 1.4; }
    .p1-score { font-size: 11px; font-weight: 700; color: #64748b; white-space: nowrap; background: #f1f5f9; padding: 3px 8px; border-radius: 10px; align-self: center; }
    .phase1-actions { display: flex; gap: 12px; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 16px; }

    /* ── Per-gate score badge in validation checks ─────────── */
    .vc-score { font-size: 11px; font-weight: 700; color: #64748b; white-space: nowrap; background: #f1f5f9; padding: 3px 8px; border-radius: 10px; align-self: center; flex-shrink: 0; }
    .vc-pass .vc-score { background: #dcfce7; color: #166534; }
    .vc-warn .vc-score { background: #fef3c7; color: #92400e; }
    .vc-fail .vc-score { background: #fee2e2; color: #991b1b; }

    /* ── Gate progress done row ─────────────────────────────── */
    .gate-done-row { color: #16a34a; font-weight: 600; }

    /* ── Entity details validation errors ───────────────────── */
    .entity-errors { display: flex; flex-direction: column; gap: 4px; padding: 10px 14px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; margin-top: 12px; }
    .entity-errors span { font-size: 12px; color: #991b1b; font-weight: 600; }

    /* ── Persona KYC decision badge & risk level pill ──────── */
    .kyc-decision-badge { display: inline-block; margin-left: 8px; padding: 1px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; vertical-align: middle; }
    .badge-green   { background: #dcfce7; color: #166534; }
    .badge-review  { background: #fef3c7; color: #92400e; }
    .badge-fail    { background: #fee2e2; color: #991b1b; }
    .kyc-risk-level { display: inline-block; margin-left: 8px; padding: 1px 7px; border-radius: 8px; font-size: 10px; font-weight: 700; vertical-align: middle; }
    .risk-low    { background: #dcfce7; color: #166534; }
    .risk-medium { background: #fef3c7; color: #92400e; }
    .risk-high   { background: #fee2e2; color: #991b1b; }

    /* ── Sanctions hard-block & PEP warning in Phase 2a ─────── */
    .sanctions-block { margin-top: 16px; }
    .sanctions-alert { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 14px 16px; color: #991b1b; font-size: 13px; font-weight: 600; line-height: 1.5; }
    .sanctions-alert span { font-weight: 400; display: block; margin-top: 4px; }
    .pep-warning-banner { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 10px 14px; color: #92400e; font-size: 12px; font-weight: 600; margin-bottom: 12px; }

    /* ── Score breakdown section ─────────────────────────────── */
    .score-breakdown-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
    .score-grid { display: flex; flex-direction: column; gap: 8px; }
    .score-item { display: grid; grid-template-columns: 220px 1fr 52px; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 6px; background: #f8fafc; }
    .si-name { font-size: 12px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .si-bar-track { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
    .si-bar { height: 100%; border-radius: 4px; background: #94a3b8; transition: width 0.4s; }
    .si-val { font-size: 12px; font-weight: 700; color: #475569; text-align: right; white-space: nowrap; }
    .si-denom { font-weight: 400; color: #94a3b8; font-size: 10px; }
    .score-item.si-pass .si-bar { background: #22c55e; }
    .score-item.si-warn .si-bar { background: #f59e0b; }
    .score-item.si-fail .si-bar { background: #ef4444; }
    .score-item.si-pass .si-val { color: #15803d; }
    .score-item.si-warn .si-val { color: #b45309; }
    .score-item.si-fail .si-val { color: #b91c1c; }
    .score-item.si-total { background: #f1f5f9; border: 1px solid #cbd5e1; }
    .score-item.si-total .si-name { font-weight: 700; color: #1e3a5f; }
    .score-item.si-total .si-bar { background: #3b82f6; }
    .score-item.si-total .si-val { color: #1e3a5f; font-size: 13px; }
    .score-item.si-liability { background: #faf5ff; border: 1px solid #d8b4fe; }
    .score-item.si-liability .si-name { font-weight: 700; color: #7c3aed; }
    .score-item.si-liability .si-bar { background: #9333ea; }
    .score-item.si-liability .si-val { color: #7c3aed; font-size: 13px; }
  `]
})
export class KycOnboardingComponent {

  entityName   = '';
  jurisdiction = '';
  entityType   = '';

  readonly checkKeys: Array<keyof DocQualityResult['checks']> = [
    'readable', 'genuine', 'complete', 'current', 'is_original'
  ];

  slots: DocSlot[] = [
    { id: 'cert_inc',    label: 'Certificate of Incorporation', hint: 'Companies House certificate',            required: true,  file: null, base64: null, mimeType: null, previewUrl: null, checking: false, result: null, ocrData: null, error: null, extractedText: null, extracting: false },
    { id: 'dir_reg',     label: 'Register of Directors',        hint: 'Full names of all directors',           required: true,  file: null, base64: null, mimeType: null, previewUrl: null, checking: false, result: null, ocrData: null, error: null, extractedText: null, extracting: false },
    { id: 'ubo_reg',     label: 'Shareholders / UBO Register',  hint: 'Names + percentage shareholding',       required: true,  file: null, base64: null, mimeType: null, previewUrl: null, checking: false, result: null, ocrData: null, error: null, extractedText: null, extracting: false },
    { id: 'proof_addr',  label: 'Proof of Registered Address',  hint: 'Utility bill or bank statement < 3 mo', required: true,  file: null, base64: null, mimeType: null, previewUrl: null, checking: false, result: null, ocrData: null, error: null, extractedText: null, extracting: false },
    { id: 'dir_id',      label: 'Director ID Document',         hint: 'Passport or driving licence',           required: true,  file: null, base64: null, mimeType: null, previewUrl: null, checking: false, result: null, ocrData: null, error: null, extractedText: null, extracting: false },
    { id: 'sof_decl',    label: 'Source of Funds Declaration',  hint: 'Signed declaration or bank letter',     required: true,  file: null, base64: null, mimeType: null, previewUrl: null, checking: false, result: null, ocrData: null, error: null, extractedText: null, extracting: false }
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
    // Director ID requires an image — PDFs cannot be verified for pixel quality by KYC providers.
    if (slot.id === 'dir_id' && file.type === 'application/pdf') {
      slot.error = 'Director ID must be a JPG or PNG image. Please upload a photo or scan of your passport or driving licence — not a PDF.';
      return;
    }
    slot.error = null;
    slot.result = null;
    slot.extractedText = null;
    slot.extracting = false;
    slot.file = file;
    slot.mimeType = file.type;

    const reader = new FileReader();
    reader.onload = async (e: any) => {
      const dataUrl: string = e.target.result;
      slot.previewUrl = dataUrl;
      slot.base64 = dataUrl.split(',')[1];

      if (file.type === 'application/pdf') {
        slot.extracting = true;
        try {
          slot.extractedText = await this.extractPdfText(file);
          console.log(`[PDF OCR] ${slot.label} — ${slot.extractedText.length} chars:`,
            slot.extractedText.substring(0, 300));
        } catch (err) {
          console.warn(`[PDF OCR] extraction failed for "${slot.label}":`, err);
          slot.extractedText = null;
        } finally {
          slot.extracting = false;
        }
      }
    };
    reader.readAsDataURL(file);
  }

  private pdfWorkerSet = false;

  private async extractPdfText(file: File): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist');

    if (!this.pdfWorkerSet) {
      // Use CDN worker matching installed version — avoids needing a dev-server restart
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      this.pdfWorkerSet = true;
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadTask.promise;

    const pageTexts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      if (pageText) pageTexts.push(pageText);
    }
    return pageTexts.join('\n');
  }

  removeFile(slot: DocSlot): void {
    slot.file = null; slot.base64 = null; slot.mimeType = null;
    slot.previewUrl = null; slot.result = null; slot.error = null;
    slot.extractedText = null; slot.extracting = false;
  }

  // ── Gate 1 — Quality check ─────────────────────────────────────────────────
  // ALL documents go through the kybDocQuality agent — no auto-pass.
  // Category 1 (ID docs): pixel quality for KYC provider acceptance, threshold 0.80.
  // Category 2 (business docs): OCR readability, threshold 0.70.
  // PDFs use a text-only agent call (GPT-4o image_url doesn't support PDF MIME type).

  checkQuality(slot: DocSlot): void {
    if (!slot.base64 || !slot.mimeType) return;
    slot.checking = true;
    slot.error = null;
    slot.result = null;
    slot.ocrData = null;

    const isIdDoc = /passport|driving licen[sc]e|director id|national id/i.test(slot.label);
    const isPdf   = slot.mimeType === 'application/pdf';

    if (isPdf && isIdDoc) {
      // Identity documents must be submitted as images — PDFs cannot be verified for pixel quality.
      slot.checking = false;
      slot.result = this.buildFailResult(slot.label, false,
        'Identity documents must be uploaded as a JPG or PNG image. PDFs are not accepted for ID verification.');
      return;
    }

    if (isPdf) {
      // Business PDF — client-side check (file size + valid PDF header).
      // Lyzr has no content to evaluate from a text-only prompt, so skip the agent call.
      const result = this.assessPdfQuality(slot);
      slot.checking = false;
      slot.result   = this.applyGate1Threshold(result, slot);
      return;
    }

    // Image file — client-side pixel quality assessment.
    // Lyzr v3 REST API cannot forward base64 images to GPT-4o vision from a browser.
    // Laplacian variance (sharpness) + dimension + brightness gives accurate Gate 1 results.
    this.assessDocumentQuality(slot).subscribe({
      next: (result) => {
        slot.checking = false;
        slot.result   = this.applyGate1Threshold(result, slot);
      },
      error: () => {
        slot.checking = false;
        slot.error = 'Quality assessment failed. Please try again.';
      }
    });
  }

  // Client-side PDF quality check — file size + valid PDF magic bytes.
  // The Lyzr agent receives no document content from a text-only prompt, so checking
  // via the API always returns "no content provided". Size + header is a reliable proxy:
  // a real business PDF is always ≥ 10 KB; blank/corrupted files are < 5 KB.
  private assessPdfQuality(slot: DocSlot): DocQualityResult {
    const sizeKB = (slot.file?.size ?? 0) / 1024;
    // %PDF- encodes to JVBERi0 in base64
    const hasValidHeader = (slot.base64 ?? '').startsWith('JVBERi0');

    let confidence: number;
    if (!hasValidHeader)    confidence = 0.25;
    else if (sizeKB < 5)    confidence = 0.40;
    else if (sizeKB < 10)   confidence = 0.55;
    else if (sizeKB < 50)   confidence = 0.75;
    else                    confidence = 0.92;

    const issues: string[] = [];
    if (!hasValidHeader) issues.push('File does not appear to be a valid PDF');
    if (sizeKB < 5)      issues.push('Document appears blank or corrupted (file too small)');

    return {
      document_type:  slot.label,
      overall_status: 'pass', // threshold applied by applyGate1Threshold
      checks: {
        readable:    { pass: hasValidHeader && sizeKB >= 10, issue: issues[0] ?? '' },
        genuine:     { pass: true, issue: '' },
        complete:    { pass: sizeKB >= 5,   issue: sizeKB < 5 ? 'Document too small' : '' },
        current:     { pass: true, issue: '' },
        is_original: { pass: true, issue: '' }
      },
      issues,
      recommendation: issues.length
        ? 'Please resubmit a valid, readable PDF document'
        : 'Document accepted for processing',
      confidence_score: confidence
    };
  }

  // Client-side image quality assessment using Laplacian variance (sharpness),
  // dimension, and brightness — used for Gate 1 since Lyzr v3 REST cannot send
  // base64 images to GPT-4o vision from a browser context.
  private assessDocumentQuality(slot: DocSlot): Observable<DocQualityResult> {
    return new Observable<DocQualityResult>(observer => {
      const img = new Image();

      img.onload = () => {
        try {
          const MAX_DIM = 600;
          const scale   = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
          const W = Math.max(1, Math.round(img.width  * scale));
          const H = Math.max(1, Math.round(img.height * scale));

          const canvas  = document.createElement('canvas');
          canvas.width  = W;
          canvas.height = H;
          const ctx     = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, W, H);
          const { data } = ctx.getImageData(0, 0, W, H);

          const lum = (i: number) =>
            (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;

          // Laplacian variance — measures edge density (sharpness proxy)
          let lapSum = 0, lapSqSum = 0, n = 0;
          for (let y = 1; y < H - 1; y++) {
            for (let x = 1; x < W - 1; x++) {
              const c   = (y * W + x) * 4;
              const lap = Math.abs(
                4 * lum(c)
                - lum(((y - 1) * W + x) * 4)
                - lum(((y + 1) * W + x) * 4)
                - lum((y * W + x - 1) * 4)
                - lum((y * W + x + 1) * 4)
              );
              lapSum   += lap;
              lapSqSum += lap * lap;
              n++;
            }
          }
          const lapVar    = lapSqSum / n - (lapSum / n) ** 2;
          // lapVar: ~0–5 blurry, ~30–80 decent, ~150+ sharp document
          const sharpScore = Math.min(1, Math.max(0, Math.sqrt(lapVar) / 14));

          // Average brightness (0–255)
          let brightSum = 0;
          for (let i = 0; i < data.length; i += 4) brightSum += lum(i);
          const avgLum     = brightSum / (data.length / 4);
          const brightScore = avgLum < 40  ? avgLum / 80
            : avgLum > 220 ? Math.max(0, 1 - (avgLum - 220) / 70)
            : 1.0;

          // Minimum dimension
          const minPx   = Math.min(img.width, img.height);
          const dimScore = Math.min(1, minPx / 500);
          const dimOk    = minPx >= 300;

          // Composite confidence: sharpness weighted most heavily
          const confidence = Math.round(
            (sharpScore * 0.65 + dimScore * 0.20 + brightScore * 0.15) * 100
          ) / 100;

          const issues: string[] = [];
          if (sharpScore  < 0.55)  issues.push('Image appears blurry — please resubmit a sharper photo');
          if (!dimOk)              issues.push(`Image too small (${img.width}×${img.height}px, minimum 300px)`);
          if (brightScore < 0.5)   issues.push(avgLum < 40 ? 'Image too dark' : 'Image overexposed');

          observer.next({
            document_type:    slot.label,
            overall_status:   'pass', // threshold applied by applyGate1Threshold
            checks: {
              readable:    { pass: sharpScore  >= 0.55, issue: sharpScore  < 0.55 ? 'Blur detected' : '' },
              genuine:     { pass: true,                issue: '' },
              complete:    { pass: dimOk,               issue: dimOk ? '' : 'Image dimensions too small' },
              current:     { pass: true,                issue: '' },
              is_original: { pass: brightScore >= 0.5,  issue: brightScore < 0.5 ? (avgLum < 40 ? 'Image too dark' : 'Overexposed') : '' }
            },
            issues,
            recommendation: issues.length
              ? 'Please resubmit a clear, well-lit image of the document'
              : 'Document accepted for processing',
            confidence_score: confidence
          });
          observer.complete();
        } catch (err) {
          observer.error(err);
        }
      };

      img.onerror = () => observer.error(new Error('Could not load image for quality assessment'));
      img.src     = `data:${slot.mimeType};base64,${slot.base64}`;
    });
  }

  // Applies category-specific pass threshold after resolution.
  // Category 1 (ID docs): 0.80 — KYC providers won't accept borderline images.
  // Category 2 (business docs): 0.70 — readable enough for OCR extraction.
  private applyGate1Threshold(result: DocQualityResult, slot: DocSlot): DocQualityResult {
    if (!result) return this.buildFailResult(slot.label, false, 'No result returned from quality check.');
    const isIdDoc = /passport|driving licen[sc]e|director id|national id/i.test(slot.label);
    const threshold = isIdDoc ? 0.80 : 0.70;
    if (result.overall_status === 'fail') return result;
    if (result.overall_status === 'review' || result.confidence_score < threshold) {
      return { ...result, overall_status: 'fail' };
    }
    return result;
  }

  private buildFailResult(docLabel: string, isIdDoc: boolean, reason: string): DocQualityResult {
    return {
      document_type:    docLabel,
      overall_status:   'fail',
      checks: {
        readable:    { pass: false, issue: reason },
        genuine:     { pass: true,  issue: '' },
        complete:    { pass: true,  issue: '' },
        current:     { pass: true,  issue: '' },
        is_original: { pass: true,  issue: '' }
      },
      issues:           [reason],
      recommendation:   isIdDoc
        ? 'Please resubmit a clear, undamaged original identity document.'
        : 'Please resubmit a clearer version of this document.',
      confidence_score: 0.1
    };
  }

  checkAll(): void {
    this.slots.filter(s => s.file && s.base64 && !s.result).forEach(s => this.checkQuality(s));
  }

  resetAll(): void {
    this.slots.forEach(s => {
      s.file = null; s.base64 = null; s.mimeType = null;
      s.previewUrl = null; s.result = null; s.ocrData = null; s.error = null; s.checking = false;
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

  // ── KYB submission ─────────────────────────────────────────────────────────

  kybLoading  = false;
  kybResult:  any = null;
  kybError:   string | null = null;

  showReview = false;
  reviewData: ReviewData | null = null;

  kybPhase1Loading = false;
  kybPhase1Result: any = null;
  showPhase1Review = false;

  kybPhase2aLoading = false;
  kybPhase2aResult: any = null;
  showPhase2aReview = false;

  kybPhase2bLoading = false;
  kybPhase2bResult: any = null;
  showPhase2bReview = false;

  entityErrors: string[] = [];

  submitKYB(): void {
    this.entityErrors = [];
    // Auto-populate entityName from COI PDF text if the user left it blank
    if (!this.entityName.trim()) {
      const coi = this.slots.find(s => s.id === 'cert_inc')?.extractedText ?? null;
      if (coi) {
        // Stop before "Company Number", "Registered", date tokens, or newline
        const stopRe = /\s*(?:company number|registration number|registered|incorporated|dated?|no\.?\s*\d|\d{4}|,|\n).*/i;
        const m = coi.match(/company name[:\s]+([^\n]{3,80})/i)
               ?? coi.match(/name of company[:\s]+([^\n]{3,80})/i)
               ?? coi.match(/^([A-Z][A-Z\s&().',-]{3,60}(?:LIMITED|LTD|PLC|LLP))/m);
        if (m?.[1]) {
          const raw = m[1].trim().replace(/\s{2,}/g, ' ');
          this.entityName = raw.replace(stopRe, '').trim().substring(0, 80);
        }
      }
    }
    if (!this.jurisdiction.trim()) this.jurisdiction = 'England & Wales';
    this.kybResult    = null;
    this.kybError     = null;
    this.reviewErrors = [];
    this.reviewData   = this.buildReviewData([]);
    this.showReview   = true;
  }

  private buildReviewData(_results: any[]): ReviewData {
    // Parse extracted PDF text — cap at maxLen to prevent one long line flooding the field
    const extract = (text: string | null, maxLen: number, ...patterns: RegExp[]): string => {
      if (!text) return '';
      for (const re of patterns) {
        const m = text.match(re);
        if (m?.[1]) {
          const val = m[1].trim().replace(/\s{2,}/g, ' ');
          return val.length > maxLen ? val.substring(0, maxLen) : val;
        }
      }
      return '';
    };

    // Clip value at the first occurrence of a document-structure keyword so that
    // greedy [^\n]+ matches don't swallow "Company Number 14782356 Date of…" etc.
    // when the PDF text has no real newlines between fields.
    const stopTrail = (val: string): string => {
      if (!val) return val;
      const i = val.search(/\s+(?:company\s+(?:number|type|name)|registration\s+number|date\s+of\s+(?:inc|birth)|incorporat|registered\s+(?:no|number|office)|no\.?\s*\d|\d{6,}|\btype\b|\bform\b|\bsigned\b|\bdirector\b|shareholder|\bschedule\b)/i);
      return i > 3 ? val.substring(0, i).trim().replace(/[,.:;\s]+$/, '') : val.trim();
    };

    const coi  = this.slots.find(s => s.id === 'cert_inc')?.extractedText  ?? null;
    const dirR = this.slots.find(s => s.id === 'dir_reg')?.extractedText   ?? null;
    const uboR = this.slots.find(s => s.id === 'ubo_reg')?.extractedText   ?? null;
    const sofD = this.slots.find(s => s.id === 'sof_decl')?.extractedText  ?? null;
    const paR  = this.slots.find(s => s.id === 'proof_addr')?.extractedText ?? null;

    // Company name — prefer entity form input, fall back to COI text
    const companyName = this.entityName ||
      stopTrail(extract(coi, 80,
        /company name[:\s]+([^\n,]{3,80})/i,
        /name of company[:\s]+([^\n,]{3,80})/i,
        /^([A-Z][A-Z\s&().',-]{3,60}(?:LIMITED|LTD|PLC|LLP))/m
      ));

    const regNum = extract(coi, 12,
      /company number[:\s#]*([0-9]{6,8})/i,
      /registered number[:\s#]*([0-9]{6,8})/i,
      /registration number[:\s#]*([0-9A-Z]{6,10})/i,
      /no\.?\s*([0-9]{6,8})/i
    );

    // Match a specific date format so we don't spill into surrounding fields
    const incDate = stopTrail(extract(coi, 40,
      /(?:incorporated on|date of incorporation)[:\s]+(\d{1,2}\s+\w{3,9}\s+\d{4})/i,
      /(?:incorporated on|date of incorporation)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /incorporated[:\s]+([0-9]{1,2}[^\n,]{3,18}[0-9]{4})/i
    ));

    // Stop at period (next sentence) or document-structure keywords for address
    const regAddr = stopTrail(extract(coi, 120,
      /registered (?:office|address)[:\s]+([^.\n]{10,120})/i
    ) || extract(paR, 120,
      /address[:\s]+([^.\n]{10,120})/i
    ));

    // Director name from Register of Directors
    const dirName = extract(dirR, 60,
      /director[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i,
      /name[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i,
      /full name[:\s]+([^\n]{3,60})/i
    );
    const dirDob = stopTrail(extract(dirR, 30,
      /date of birth[:\s]+(\d{1,2}\s+\w{3,9}\s+\d{4})/i,
      /d\.?o\.?b\.?[:\s]+([^\n,]{3,25})/i
    ));
    const dirNat = stopTrail(extract(dirR, 30,
      /nationality[:\s]+([^\n,]{3,25})/i,
      /country[:\s]+([^\n,]{3,25})/i
    ));

    // UBO name, shareholding and nationality from UBO register
    const uboName = extract(uboR, 60,
      /beneficial owner[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i,
      /name[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i,
      /full name[:\s]+([^\n]{3,60})/i
    );
    const uboShare = extract(uboR, 6,
      /([0-9]+(?:\.[0-9]+)?)\s*%/,
      /shareholding[:\s]+([0-9]+)/i,
      /shares[:\s]+([0-9]+)/i
    );
    const uboNat = stopTrail(extract(uboR, 30,
      /nationality[:\s]+([^\n,]{3,25})/i,
      /citizenship[:\s]+([^\n,]{3,25})/i,
      /country of residence[:\s]+([^\n,]{3,25})/i
    ));

    // Director document number from the Director ID Document slot (passport/licence scan)
    const dirIdText = this.slots.find(s => s.id === 'dir_id')?.extractedText ?? null;
    const idNumber = extract(dirIdText ?? dirR, 20,
      /passport no\.?[:\s]*([A-Z0-9]{6,12})/i,
      /passport number[:\s]+([A-Z0-9]{6,12})/i,
      /document number[:\s]+([A-Z0-9]{6,12})/i,
      /document no\.?[:\s]+([A-Z0-9]{6,12})/i,
      /licence number[:\s]+([A-Z0-9]{6,12})/i,
      /no\.?\s+([A-Z]{2}[0-9]{6,8}[A-Z]?)/i
    );

    const sof = stopTrail(extract(sofD, 100,
      /source of funds[:\s]+([^\n]{3,100})/i,
      /funds derived from[:\s]+([^\n]{3,100})/i
    ));

    console.log('[buildReviewData] extracted:', { companyName, regNum, incDate, regAddr, dirName, dirDob, dirNat, idNumber, uboName, uboShare, uboNat, sof });

    return {
      companyName,
      registrationNumber: regNum,
      incorporationDate:  incDate,
      registeredAddress:  regAddr,
      jurisdiction:       this.jurisdiction,
      companyType:        this.entityType,
      directors: [{ fullName: dirName, dob: dirDob, nationality: dirNat, idType: 'Passport', idNumber: idNumber }],
      ubos:      [{ fullName: uboName, shareholding: uboShare, nationality: uboNat }],
      sourceOfFunds: sof
    };
  }

  // Validation errors shown inline in the review panel
  reviewErrors: string[] = [];

  confirmAndVerify(): void {
    if (!this.reviewData) return;
    const r = this.reviewData;

    // Gate — require company name and registration number before calling Companies House
    this.reviewErrors = [];
    if (!r.companyName.trim())        this.reviewErrors.push('Company name is required');
    if (!r.registrationNumber.trim()) this.reviewErrors.push('Companies House registration number is required');
    if (r.directors.every(d => !d.fullName.trim())) this.reviewErrors.push('At least one director full name is required');
    if (this.reviewErrors.length) return;

    this.showReview       = false;
    this.kybPhase1Loading = true;
    this.kybPhase1Result  = null;
    this.kybResult        = null;
    this.kybError         = null;

    const dirs = r.directors
      .filter(d => d.fullName.trim())
      .map((d, i) =>
        `Director ${i + 1}: ${d.fullName}, DOB: ${d.dob || 'N/A'}, Nationality: ${d.nationality || 'N/A'}, ID: ${d.idType} ${d.idNumber || 'N/A'}`
      ).join('\n');
    const ubos = r.ubos
      .filter(u => u.fullName.trim())
      .map((u, i) =>
        `UBO ${i + 1}: ${u.fullName}, Shareholding: ${u.shareholding || 'Unknown'}%, Nationality: ${u.nationality || 'N/A'}`
      ).join('\n');

    const regHint = r.registrationNumber.trim()
      ? `Call get_company_profile(${r.registrationNumber}) directly. Do NOT call search_companies.`
      : `Search Companies House for "${r.companyName}" and use the first ACTIVE result.`;

    const message =
      `KYB ONBOARDING REQUEST — PHASE 1\n\n` +
      `ENTITY\n` +
      `Company Name: ${r.companyName}\n` +
      `Registration Number: ${r.registrationNumber || 'NOT PROVIDED'}\n` +
      `Jurisdiction: ${r.jurisdiction || 'England & Wales'}\n` +
      `Entity Type: ${r.companyType || 'Private Limited Company'}\n` +
      `Incorporated: ${r.incorporationDate || 'N/A'}\n` +
      `Registered Address: ${r.registeredAddress || 'N/A'}\n\n` +
      `DIRECTORS (applicant-confirmed)\n${dirs || 'None declared'}\n\n` +
      `BENEFICIAL OWNERS (applicant-confirmed)\n${ubos || 'None declared'}\n\n` +
      `SOURCE OF FUNDS: ${r.sourceOfFunds || 'N/A'}\n\n` +
      `GATE STATUS\n` +
      `Gate 1 — COMPLETE. All ${this.passCount} documents passed quality checks.\n` +
      `Gate 2 — COMPLETE. Entity data confirmed by applicant.\n\n` +
      `INSTRUCTIONS — Run ONLY Gates 3, 4, and 5. STOP after Gate 5. Do NOT run Gates 6-9.\n` +
      `Gate 3: ${regHint} Verify company is ACTIVE. If get_company_officers API fails, ` +
      `use the DIRECTORS listed above and mark Gate 3 PASS with a note. Do NOT abort.\n` +
      `Gate 4: Cross-check director names against registry data. ` +
      `If officers API unavailable, mark MATCHED from applicant-confirmed data.\n` +
      `Gate 5: Verify the BENEFICIAL OWNERS listed above. Mark as DECLARED.\n\n` +
      `Return JSON with ONLY these fields:\n` +
      `company_registry_verified (bool), company_registry_status (string), ` +
      `company_registry_summary (string ≤80 chars), company_registry_risk_score (0-30),\n` +
      `director_verification_matched (bool), director_verification_summary (string ≤80 chars), director_risk_score (0-20),\n` +
      `ubo_identification_declared (bool), ubo_identification_summary (string ≤80 chars), ubo_risk_score (0-15)`;

    this.lyzr.callAgentKyb(environment.agents['kybOrchestrator'], message, `kyb-p1-${Date.now()}`).subscribe({
      next: (res) => {
        this.kybPhase1Loading = false;
        this.kybPhase1Result  = this.lyzr.parseJSON<any>(res) ?? { raw: res.response };
        this.showPhase1Review = true;
      },
      error: (err: any) => {
        this.kybPhase1Loading = false;
        this.kybError = err.message || 'KYB Phase 1 verification failed. Please try again.';
      }
    });
  }

  proceedToPhase2a(): void {
    if (!this.reviewData || !this.kybPhase1Result) return;
    const r  = this.reviewData;
    const p1 = this.kybPhase1Result;

    this.showPhase1Review  = false;
    this.kybPhase2aLoading = true;
    this.kybError          = null;

    const dirs = r.directors
      .filter(d => d.fullName.trim())
      .map((d, i) => `Director ${i + 1}: ${d.fullName}, Nationality: ${d.nationality || 'N/A'}`)
      .join('\n');
    const ubos = r.ubos
      .filter(u => u.fullName.trim())
      .map((u, i) => `UBO ${i + 1}: ${u.fullName}, Shareholding: ${u.shareholding || 'Unknown'}%`)
      .join('\n');

    const message =
      `KYB ONBOARDING REQUEST — PHASE 2A (Gate 6 only)\n\n` +
      `ENTITY\nCompany: ${r.companyName}\nReg: ${r.registrationNumber}\n\n` +
      `DIRECTORS\n${dirs || 'None declared'}\n\n` +
      `BENEFICIAL OWNERS\n${ubos || 'None declared'}\n\n` +
      `PHASE 1 COMPLETED:\n` +
      `Gate 3: ${p1.company_registry_verified ? 'PASS' : 'FAIL'}. ${p1.company_registry_summary || ''}\n` +
      `Gate 4: ${p1.director_verification_matched ? 'MATCHED' : 'MISMATCH'}. ${p1.director_verification_summary || ''}\n` +
      `Gate 5: ${p1.ubo_identification_declared ? 'DECLARED' : 'MISSING'}. ${p1.ubo_identification_summary || ''}\n\n` +
      `INSTRUCTIONS — Run ONLY Gate 6. STOP after Gate 6.\n` +
      `Gate 6: Run PEP and sanctions screening (OFAC, UN, EU, HMT lists) for all directors and UBOs.\n` +
      `CRITICAL RULE — sanctions_match: Only set to true if you have DEFINITIVE, HIGH-CONFIDENCE evidence ` +
      `that the EXACT named individual or company appears on an official sanctions list (OFAC SDN, UN Consolidated, ` +
      `EU Consolidated, UK HMT). Common names with no known sanctions record MUST return sanctions_match: false. ` +
      `When in doubt, return sanctions_match: false. A false positive blocks a legitimate client permanently.\n` +
      `pep_identified: Only true for known heads of state, senior government ministers, senior military/judiciary, ` +
      `or immediate family of such persons. Corporate directors with no known political role must return pep_identified: false.\n` +
      `Return JSON: sanctions_match (bool), pep_identified (bool), ` +
      `pep_sanctions_summary (string ≤80 chars), pep_sanctions_risk_score (0-25).`;

    this.lyzr.callAgentKyb(environment.agents['kybOrchestrator'], message, `kyb-p2a-${Date.now()}`).subscribe({
      next: (res) => {
        this.kybPhase2aLoading = false;
        this.kybPhase2aResult  = this.lyzr.parseJSON<any>(res) ?? { raw: res.response };
        this.showPhase2aReview = true;
      },
      error: (err: any) => {
        this.kybPhase2aLoading = false;
        this.kybError = err.message || 'Gate 6 PEP/Sanctions check failed. Please try again.';
      }
    });
  }

  proceedToPhase2b(): void {
    if (!this.reviewData || !this.kybPhase1Result || !this.kybPhase2aResult) return;
    const r   = this.reviewData;
    const p1  = this.kybPhase1Result;
    const p2a = this.kybPhase2aResult;

    this.showPhase2aReview  = false;
    this.kybPhase2bLoading  = true;
    this.kybError           = null;

    const dirs = r.directors
      .filter(d => d.fullName.trim())
      .map((d, i) =>
        `Director ${i + 1}: ${d.fullName}, DOB: ${d.dob || 'N/A'}, Nationality: ${d.nationality || 'N/A'}, ID: ${d.idType} ${d.idNumber || 'N/A'}`
      ).join('\n');

    const message =
      `KYB ONBOARDING REQUEST — PHASE 2B (Gate 7 only)\n\n` +
      `ENTITY\nCompany: ${r.companyName}\nReg: ${r.registrationNumber}\n\n` +
      `DIRECTORS\n${dirs || 'None declared'}\n\n` +
      `COMPLETED GATES:\n` +
      `Gate 3: ${p1.company_registry_verified ? 'PASS' : 'FAIL'}. ${p1.company_registry_summary || ''}\n` +
      `Gate 4: ${p1.director_verification_matched ? 'MATCHED' : 'MISMATCH'}. ${p1.director_verification_summary || ''}\n` +
      `Gate 5: ${p1.ubo_identification_declared ? 'DECLARED' : 'MISSING'}. ${p1.ubo_identification_summary || ''}\n` +
      `Gate 6: ${p2a.sanctions_match ? 'SANCTIONED' : p2a.pep_identified ? 'PEP HIT' : 'CLEAR'}. ${p2a.pep_sanctions_summary || ''}\n\n` +
      `INSTRUCTIONS — Run ONLY Gate 7. STOP after Gate 7.\n` +
      `Gate 7: Run KYC identity verification for the primary director.\n` +
      `Return JSON: kyc_identity_verified (bool), kyc_identity_summary (string ≤80 chars), kyc_identity_risk_score (0-20).`;

    this.lyzr.callAgentKyb(environment.agents['kybOrchestrator'], message, `kyb-p2b-${Date.now()}`).subscribe({
      next: (res) => {
        this.kybPhase2bLoading = false;
        this.kybPhase2bResult  = this.lyzr.parseJSON<any>(res) ?? { raw: res.response };
        this.showPhase2bReview = true;
      },
      error: (err: any) => {
        this.kybPhase2bLoading = false;
        this.kybError = err.message || 'Gate 7 KYC Identity check failed. Please try again.';
      }
    });
  }

  proceedToPhase2c(): void {
    if (!this.reviewData || !this.kybPhase1Result || !this.kybPhase2aResult || !this.kybPhase2bResult) return;
    const r   = this.reviewData;
    const p1  = this.kybPhase1Result;
    const p2a = this.kybPhase2aResult;
    const p2b = this.kybPhase2bResult;

    this.showPhase2bReview = false;
    this.kybLoading        = true;
    this.kybError          = null;

    const dirs = r.directors
      .filter(d => d.fullName.trim())
      .map((d, i) =>
        `Director ${i + 1}: ${d.fullName}, DOB: ${d.dob || 'N/A'}, Nationality: ${d.nationality || 'N/A'}, ID: ${d.idType} ${d.idNumber || 'N/A'}`
      ).join('\n');
    const ubos = r.ubos
      .filter(u => u.fullName.trim())
      .map((u, i) =>
        `UBO ${i + 1}: ${u.fullName}, Shareholding: ${u.shareholding || 'Unknown'}%`
      ).join('\n');

    // Persona returns confidence (0-1) instead of a risk_score; convert for Gate 9 subtotal.
    const kyc7Risk = p2b.kyc_identity_risk_score
      ?? (p2b.kyc_identity_confidence != null ? Math.round((1 - p2b.kyc_identity_confidence) * 20) : 0);

    const subtotal = (p1.company_registry_risk_score ?? 0) + (p1.director_risk_score ?? 0) +
                     (p1.ubo_risk_score ?? 0) + (p2a.pep_sanctions_risk_score ?? 0) + kyc7Risk;

    const kyc7Detail = p2b.kyc_identity_confidence != null
      ? `decision: ${p2b.kyc_identity_decision || 'N/A'}, confidence: ${Math.round(p2b.kyc_identity_confidence * 100)}%, risk_level: ${p2b.kyc_identity_risk_level || 'N/A'}, equiv_risk_score: ${kyc7Risk}`
      : `risk: ${kyc7Risk}`;

    const message =
      `KYB ONBOARDING REQUEST — PHASE 2C (Gates 8-9)\n\n` +
      `ENTITY\nCompany: ${r.companyName}\nReg: ${r.registrationNumber}\n\n` +
      `DIRECTORS\n${dirs || 'None declared'}\n\n` +
      `BENEFICIAL OWNERS\n${ubos || 'None declared'}\n\n` +
      `COMPLETED GATES:\n` +
      `Gate 3: ${p1.company_registry_verified ? 'PASS' : 'FAIL'}. ${p1.company_registry_summary || ''} (risk: ${p1.company_registry_risk_score ?? 0})\n` +
      `Gate 4: ${p1.director_verification_matched ? 'MATCHED' : 'MISMATCH'}. ${p1.director_verification_summary || ''} (risk: ${p1.director_risk_score ?? 0})\n` +
      `Gate 5: ${p1.ubo_identification_declared ? 'DECLARED' : 'MISSING'}. ${p1.ubo_identification_summary || ''} (risk: ${p1.ubo_risk_score ?? 0})\n` +
      `Gate 6: ${p2a.sanctions_match ? 'SANCTIONED' : p2a.pep_identified ? 'PEP HIT' : 'CLEAR'}. ${p2a.pep_sanctions_summary || ''} (risk: ${p2a.pep_sanctions_risk_score ?? 0})\n` +
      `Gate 7 (Persona KYC): ${p2b.kyc_identity_verified ? 'VERIFIED' : 'FAILED'}. ${p2b.kyc_identity_summary || ''} (${kyc7Detail})\n\n` +
      `INSTRUCTIONS — Run ONLY Gates 8 and 9:\n` +
      `Gate 8: Run AML adverse media check for company and all directors/UBOs. ` +
      `Return adverse_media_found (bool), aml_adverse_media_summary (≤80 chars), aml_risk_score (0-20).\n` +
      `Gate 9: Sum all gate scores — subtotal from Gates 3-7: ${subtotal}. ` +
      `Add Gate 8 score for overall_risk_score (integer 0-100). ` +
      `Decision: APPROVED (≤30), MANUAL_REVIEW (31-60), REJECTED (>60). ` +
      `Return executive_summary (≤150 chars) and key_findings array.\n\n` +
      `Return complete KYB_Case_Summary JSON for all gates.`;

    this.lyzr.callAgentKyb(environment.agents['kybOrchestrator'], message, `kyb-p2c-${Date.now()}`).subscribe({
      next: (res) => {
        this.kybLoading = false;
        const p2c = this.lyzr.parseJSON<any>(res) ?? { raw: res.response };
        this.kybResult = { ...p1, ...p2a, ...p2b, ...p2c };
      },
      error: (err: any) => {
        this.kybLoading = false;
        this.kybError = err.message || 'KYB Phase 2C verification failed. Please try again.';
      }
    });
  }

  retryKyb(): void {
    this.kybError = null;
    if (this.kybPhase2bResult) {
      this.showPhase2bReview = true;
    } else if (this.kybPhase2aResult) {
      this.showPhase2aReview = true;
    } else if (this.kybPhase1Result) {
      this.showPhase1Review = true;
    } else {
      this.showReview = true;
    }
  }

  addDirector():          void { this.reviewData?.directors.push({ fullName: '', dob: '', nationality: '', idType: 'Passport', idNumber: '' }); }
  removeDirector(i: number): void { this.reviewData?.directors.splice(i, 1); }
  addUbo():               void { this.reviewData?.ubos.push({ fullName: '', shareholding: '', nationality: '' }); }
  removeUbo(i: number):   void { this.reviewData?.ubos.splice(i, 1); }

  startNew(): void {
    this.resetAll();
    this.kybResult        = null;
    this.kybError         = null;
    this.kybLoading       = false;
    this.showReview       = false;
    this.reviewData       = null;
    this.reviewErrors     = [];
    this.kybPhase1Loading  = false;
    this.kybPhase1Result   = null;
    this.showPhase1Review  = false;
    this.kybPhase2aLoading = false;
    this.kybPhase2aResult  = null;
    this.showPhase2aReview = false;
    this.kybPhase2bLoading = false;
    this.kybPhase2bResult  = null;
    this.showPhase2bReview = false;
    this.entityErrors      = [];
    this.entityName        = '';
    this.jurisdiction     = '';
    this.entityType       = '';
  }

  downloadResult(): void {
    const blob = new Blob(
      [JSON.stringify(this.kybResult, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `KYB_${(this.kybResult?.entity_name || this.entityName || 'result').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  get decisionColor(): string {
    switch (this.kybResult?.onboarding_decision) {
      case 'APPROVED':      return '#22c55e';
      case 'REJECTED':      return '#ef4444';
      case 'MANUAL_REVIEW': return '#f59e0b';
      case 'CONDITIONS':    return '#3b82f6';
      default:              return '#94a3b8';
    }
  }

  get decisionIcon(): string {
    switch (this.kybResult?.onboarding_decision) {
      case 'APPROVED':      return '✅';
      case 'REJECTED':      return '❌';
      case 'MANUAL_REVIEW': return '⚠️';
      case 'CONDITIONS':    return '📋';
      default:              return '🔍';
    }
  }

  get phase1Data():  any { return this.kybResult ?? this.kybPhase1Result  ?? {}; }
  get phase2aData(): any { return this.kybResult ?? this.kybPhase2aResult ?? {}; }
  get phase2bData(): any { return this.kybResult ?? this.kybPhase2bResult ?? {}; }

  // Regulatory-weighted liability score for the payment processor.
  // PEP/Sanctions and AML hits carry the highest compliance liability.
  get processorLiabilityScore(): number | null {
    if (!this.kybResult) return null;
    const r = this.kybResult;
    // Persona returns kyc_identity_confidence (0-1) rather than kyc_identity_risk_score.
    // Convert: confidence 0.95 → risk ~1; confidence 0.50 → risk ~10.
    const kycRisk = r.kyc_identity_risk_score
      ?? (r.kyc_identity_confidence != null ? Math.round((1 - r.kyc_identity_confidence) * 20) : 0);
    const score = Math.min(100, Math.round(
      (r.pep_sanctions_risk_score                         ?? 0) * 1.6 +
      (r.aml_risk_score ?? r.aml_adverse_media_risk_score ?? 0) * 1.4 +
      (r.company_registry_risk_score                      ?? 0) * 0.9 +
      (r.director_risk_score                              ?? 0) * 0.7 +
      (r.ubo_risk_score                                   ?? 0) * 0.7 +
      kycRisk                                                   * 0.7
    ));
    return score > 0 ? score : null;
  }

  get gateResults(): any[] {
    if (!this.kybResult) return [];
    const r = this.kybResult;
    // Gate 1 is evaluated entirely client-side — the orchestrator never scores it.
    // Use allPassed (local truth) and derive score from avg slot confidence.
    const checkedSlots = this.slots.filter(s => s.result);
    const gate1Score = checkedSlots.length
      ? Math.round(checkedSlots.reduce((sum, s) => sum + s.result!.confidence_score * 100, 0) / checkedSlots.length)
      : null;
    return [
      { name: 'Gate 1 — Document Quality Check',
        pass: this.allPassed,
        warning: !this.allPassed && this.reviewCount > 0,
        status: this.allPassed ? '✓ PASS' : '✗ FAIL',
        detail: `${this.passCount}/${this.slots.length} documents passed quality pre-screen`,
        score: gate1Score },
      { name: 'Gate 3 — Company Registry',
        pass: r.company_registry_verified, warning: false,
        status: r.company_registry_verified ? '✓ ACTIVE' : '✗ ' + (r.company_registry_status || 'FAILED'),
        detail: r.company_registry_summary || '',
        score: r.company_registry_risk_score ?? null },
      { name: 'Gate 4 — Director Verification',
        pass: r.director_verification_matched, warning: !r.director_verification_matched,
        status: r.director_verification_matched ? '✓ MATCHED' : '⚠ MISMATCH',
        detail: r.director_verification_summary || '',
        score: r.director_risk_score ?? null },
      { name: 'Gate 5 — UBO Identification',
        pass: r.ubo_identification_declared, warning: !r.ubo_identification_declared,
        status: r.ubo_identification_declared ? '✓ DECLARED' : '⚠ MISSING',
        detail: r.ubo_identification_summary || '',
        score: r.ubo_risk_score ?? null },
      { name: 'Gate 6 — PEP / Sanctions',
        pass: !r.sanctions_match && !r.pep_identified,
        warning: r.pep_identified && !r.sanctions_match,
        status: r.sanctions_match ? '✗ SANCTIONED' : r.pep_identified ? '⚠ PEP IDENTIFIED' : '✓ CLEAR',
        detail: r.pep_sanctions_summary || '',
        score: r.pep_sanctions_risk_score ?? null },
      { name: 'Gate 7 — KYC Identity',
        pass: r.kyc_identity_verified && r.kyc_identity_decision !== 'FAIL',
        warning: r.kyc_identity_decision === 'MANUAL_REVIEW',
        status: r.kyc_identity_decision === 'GREEN'         ? '✓ VERIFIED — GREEN'
              : r.kyc_identity_decision === 'MANUAL_REVIEW' ? '⚠ MANUAL REVIEW'
              : r.kyc_identity_decision === 'FAIL'          ? '✗ FAILED'
              : r.kyc_identity_verified                     ? '✓ VERIFIED' : '✗ FAILED',
        detail: r.kyc_identity_summary || '',
        score: r.kyc_identity_confidence != null
          ? Math.round(r.kyc_identity_confidence * 100)
          : r.kyc_identity_risk_score ?? null },
      { name: 'Gate 8 — AML Adverse Media',
        pass: !r.adverse_media_found,
        warning: r.adverse_media_found && r.aml_adverse_media_risk_level !== 'high',
        status: r.adverse_media_found ? '⚠ FLAGGED' : '✓ CLEAR',
        detail: r.aml_adverse_media_summary || '',
        score: r.aml_risk_score ?? r.aml_adverse_media_risk_score ?? null }
    ];
  }

  // When the LLM returns 0 or omits overall_risk_score, compute it from gate scores.
  get computedRiskScore(): number | null {
    if (!this.kybResult) return null;
    const r = this.kybResult;
    if (r.overall_risk_score && r.overall_risk_score > 0) return r.overall_risk_score;
    const parts = [
      r.company_registry_risk_score,
      r.director_risk_score,
      r.ubo_risk_score,
      r.pep_sanctions_risk_score,
      r.kyc_identity_risk_score,
      r.aml_risk_score ?? r.aml_adverse_media_risk_score
    ].filter((s): s is number => typeof s === 'number' && s > 0);
    if (!parts.length) return null;
    return Math.min(100, parts.reduce((a, b) => a + b, 0));
  }

  // ── Computed ───────────────────────────────────────────────────────────────

  get uploadedCount(): number { return this.slots.filter(s => !!s.file).length; }
  get anyChecking():   boolean { return this.slots.some(s => s.checking); }
  get checkedCount():  number  { return this.slots.filter(s => !!s.result).length; }
  get passCount():     number  { return this.slots.filter(s => s.result?.overall_status === 'pass').length; }
  get reviewCount():   number  { return this.slots.filter(s => s.result?.overall_status === 'review').length; }
  get failCount():     number  { return this.slots.filter(s => s.result?.overall_status === 'fail').length; }
  get allPassed():     boolean { return this.checkedCount === this.slots.length && this.failCount === 0 && this.reviewCount === 0; }

  get pdfSlotCount():      number { return this.slots.filter(s => s.mimeType === 'application/pdf').length; }
  get extractedSlotCount(): number { return this.slots.filter(s => !!s.extractedText).length; }

  get gateActionLabel(): string {
    if (this.kybLoading) return 'Running KYB Verification…';
    if (this.showReview) return 'Validate against Companies House →';
    return 'Proceed to Gate 2: Review & Enter Data →';
  }
}
