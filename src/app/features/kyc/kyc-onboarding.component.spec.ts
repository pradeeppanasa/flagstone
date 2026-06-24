import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { KycOnboardingComponent } from './kyc-onboarding.component';
import { LyzrAgentService } from '../../core/services/lyzr-agent.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { GovernanceService } from '../../core/services/governance.service';

describe('KycOnboardingComponent', () => {
  let component: KycOnboardingComponent;
  let fixture: ComponentFixture<KycOnboardingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, HttpClientTestingModule],
      declarations: [KycOnboardingComponent],
      providers: [LyzrAgentService, GovernanceService]
    }).compileComponents();

    fixture = TestBed.createComponent(KycOnboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── isImage ───────────────────────────────────────────────────────────────

  describe('isImage()', () => {
    it('returns true for image/jpeg', () => expect(component.isImage('image/jpeg')).toBeTrue());
    it('returns true for image/png',  () => expect(component.isImage('image/png')).toBeTrue());
    it('returns false for application/pdf', () => expect(component.isImage('application/pdf')).toBeFalse());
    it('returns false for null',  () => expect(component.isImage(null)).toBeFalse());
    it('returns false for empty string', () => expect(component.isImage('')).toBeFalse());
  });

  // ── formatSize ────────────────────────────────────────────────────────────

  describe('formatSize()', () => {
    it('formats bytes below 1 MB as KB', () => {
      expect(component.formatSize(512 * 1024)).toBe('512 KB');
    });

    it('formats exactly 1MB boundary as KB (uses strict >)', () => {
      expect(component.formatSize(1024 * 1024)).toBe('1024 KB');
    });

    it('formats just over 1 MB as MB', () => {
      expect(component.formatSize(1024 * 1024 + 1)).toBe('1.0 MB');
    });

    it('formats large file as MB', () => {
      expect(component.formatSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });

    it('formats small file as KB', () => {
      expect(component.formatSize(100)).toBe('0 KB');
    });
  });

  // ── checkLabel ────────────────────────────────────────────────────────────

  describe('checkLabel()', () => {
    it('maps "readable" → "Readable"',     () => expect(component.checkLabel('readable')).toBe('Readable'));
    it('maps "genuine" → "Genuine"',       () => expect(component.checkLabel('genuine')).toBe('Genuine'));
    it('maps "complete" → "Complete"',     () => expect(component.checkLabel('complete')).toBe('Complete'));
    it('maps "current" → "Current"',       () => expect(component.checkLabel('current')).toBe('Current'));
    it('maps "is_original" → "Original"',  () => expect(component.checkLabel('is_original')).toBe('Original'));
    it('returns key itself for unknowns',  () => expect(component.checkLabel('unknown_key')).toBe('unknown_key'));
  });

  // ── confPct ───────────────────────────────────────────────────────────────

  describe('confPct()', () => {
    it('converts decimal 0.95 → 95', () => expect(component.confPct(0.95)).toBe(95));
    it('converts decimal 0.0  → 0',  () => expect(component.confPct(0.0)).toBe(0));
    it('converts decimal 1.0  → 100', () => expect(component.confPct(1.0)).toBe(100));
    it('passes through integer 95 → 95 (Persona format)', () => expect(component.confPct(95)).toBe(95));
    it('passes through integer 100 → 100', () => expect(component.confPct(100)).toBe(100));
    it('converts integer 50 → 50', () => expect(component.confPct(50)).toBe(50));
    it('returns null for null', () => expect(component.confPct(null)).toBeNull());
    it('returns null for undefined', () => expect(component.confPct(undefined)).toBeNull());
  });

  // ── computedRiskScore ─────────────────────────────────────────────────────

  describe('computedRiskScore', () => {
    it('returns null when kybResult is null', () => {
      component.kybResult = null;
      expect(component.computedRiskScore).toBeNull();
    });

    it('uses overall_risk_score when present and positive', () => {
      component.kybResult = { overall_risk_score: 42 };
      expect(component.computedRiskScore).toBe(42);
    });

    it('caps overall_risk_score at 100', () => {
      component.kybResult = { overall_risk_score: 115 };
      expect(component.computedRiskScore).toBe(100);
    });

    it('ignores zero overall_risk_score and sums gate scores', () => {
      component.kybResult = {
        overall_risk_score: 0,
        company_registry_risk_score: 5,
        director_risk_score: 3,
        ubo_risk_score: 3
      };
      expect(component.computedRiskScore).toBe(11);
    });

    it('computes from gate scores when overall_risk_score is absent', () => {
      component.kybResult = {
        company_registry_risk_score: 10,
        director_risk_score: 5,
        ubo_risk_score: 3,
        pep_sanctions_risk_score: 0,
        kyc_identity_risk_score: 2,
        aml_risk_score: 4
      };
      expect(component.computedRiskScore).toBe(24);
    });

    it('returns null when kybResult has no scores', () => {
      component.kybResult = { entity_name: 'Test Corp' };
      expect(component.computedRiskScore).toBeNull();
    });

    it('caps computed sum at 100', () => {
      component.kybResult = {
        company_registry_risk_score: 30,
        director_risk_score: 20,
        ubo_risk_score: 15,
        pep_sanctions_risk_score: 25,
        kyc_identity_risk_score: 20,
        aml_risk_score: 20
      };
      expect(component.computedRiskScore).toBe(100);
    });
  });

  // ── processorLiabilityScore ───────────────────────────────────────────────

  describe('processorLiabilityScore', () => {
    it('returns null when kybResult is null', () => {
      component.kybResult = null;
      expect(component.processorLiabilityScore).toBeNull();
    });

    it('applies PEP weight ×1.6', () => {
      // kyc_identity_risk_score: 0 prevents the default kycRisk=20 when confidence is null
      component.kybResult = { pep_sanctions_risk_score: 25, kyc_identity_risk_score: 0 };
      // 25 * 1.6 = 40
      expect(component.processorLiabilityScore).toBe(40);
    });

    it('applies AML weight ×1.4', () => {
      component.kybResult = { aml_risk_score: 10, kyc_identity_risk_score: 0 };
      // 10 * 1.4 = 14
      expect(component.processorLiabilityScore).toBe(14);
    });

    it('returns null when all scores are zero', () => {
      component.kybResult = {
        pep_sanctions_risk_score: 0, aml_risk_score: 0,
        company_registry_risk_score: 0, director_risk_score: 0,
        ubo_risk_score: 0, kyc_identity_risk_score: 0
      };
      expect(component.processorLiabilityScore).toBeNull();
    });

    it('caps at 100 for extreme scores', () => {
      component.kybResult = {
        pep_sanctions_risk_score: 25, aml_risk_score: 20,
        company_registry_risk_score: 30, director_risk_score: 20,
        ubo_risk_score: 15, kyc_identity_risk_score: 20
      };
      expect(component.processorLiabilityScore).toBe(100);
    });
  });

  // ── gateResults ───────────────────────────────────────────────────────────

  describe('gateResults', () => {
    it('returns empty array when kybResult is null', () => {
      component.kybResult = null;
      expect(component.gateResults).toEqual([]);
    });

    it('returns 8 gates', () => {
      component.kybResult = {
        company_registry_verified: true, director_verification_matched: true,
        ubo_identification_declared: true, sanctions_match: false, pep_identified: false,
        kyc_identity_verified: true, adverse_media_found: false
      };
      expect(component.gateResults.length).toBe(8);
    });

    it('Gate 2 always passes', () => {
      component.kybResult = { company_registry_verified: false };
      const gate2 = component.gateResults.find(g => g.name.includes('Gate 2'));
      expect(gate2?.pass).toBeTrue();
    });

    it('Gate 3 passes when company_registry_verified is true', () => {
      component.kybResult = { company_registry_verified: true, company_registry_risk_score: 5 };
      const gate3 = component.gateResults.find(g => g.name.includes('Gate 3'));
      expect(gate3?.pass).toBeTrue();
      expect(gate3?.status).toContain('ACTIVE');
    });

    it('Gate 3 fails when company_registry_verified is false', () => {
      component.kybResult = { company_registry_verified: false, company_registry_status: 'DISSOLVED' };
      const gate3 = component.gateResults.find(g => g.name.includes('Gate 3'));
      expect(gate3?.pass).toBeFalse();
      expect(gate3?.status).toContain('DISSOLVED');
    });

    it('Gate 6 passes when no sanctions and no PEP', () => {
      component.kybResult = { sanctions_match: false, pep_identified: false };
      const gate6 = component.gateResults.find(g => g.name.includes('Gate 6'));
      expect(gate6?.pass).toBeTrue();
      expect(gate6?.status).toContain('CLEAR');
    });

    it('Gate 6 fails when sanctions_match is true', () => {
      component.kybResult = { sanctions_match: true, pep_identified: false };
      const gate6 = component.gateResults.find(g => g.name.includes('Gate 6'));
      expect(gate6?.pass).toBeFalse();
      expect(gate6?.status).toContain('SANCTIONED');
    });

    it('Gate 6 warns when PEP identified but not sanctioned', () => {
      component.kybResult = { sanctions_match: false, pep_identified: true };
      const gate6 = component.gateResults.find(g => g.name.includes('Gate 6'));
      expect(gate6?.pass).toBeFalse();
      expect(gate6?.warning).toBeTrue();
      expect(gate6?.status).toContain('PEP');
    });

    it('Gate 7 shows GREEN when kyc_identity_decision is GREEN', () => {
      component.kybResult = { kyc_identity_verified: true, kyc_identity_decision: 'GREEN', kyc_identity_confidence: 0.97 };
      const gate7 = component.gateResults.find(g => g.name.includes('Gate 7'));
      expect(gate7?.pass).toBeTrue();
      expect(gate7?.status).toContain('GREEN');
    });

    it('Gate 7 warns for MANUAL_REVIEW', () => {
      component.kybResult = { kyc_identity_verified: false, kyc_identity_decision: 'MANUAL_REVIEW' };
      const gate7 = component.gateResults.find(g => g.name.includes('Gate 7'));
      expect(gate7?.warning).toBeTrue();
    });

    it('Gate 8 clears when adverse_media_found is false', () => {
      component.kybResult = { adverse_media_found: false };
      const gate8 = component.gateResults.find(g => g.name.includes('Gate 8'));
      expect(gate8?.pass).toBeTrue();
      expect(gate8?.status).toContain('CLEAR');
    });

    it('Gate 3 conf derived from risk score (5/30 → 83%)', () => {
      component.kybResult = { company_registry_verified: true, company_registry_risk_score: 5 };
      const gate3 = component.gateResults.find(g => g.name.includes('Gate 3'));
      expect(gate3?.conf).toBe(83);
    });

    it('Gate 6 conf is 100 when pep_sanctions_risk_score is 0', () => {
      component.kybResult = { sanctions_match: false, pep_identified: false, pep_sanctions_risk_score: 0 };
      const gate6 = component.gateResults.find(g => g.name.includes('Gate 6'));
      expect(gate6?.conf).toBe(100);
    });
  });

  // ── gateResults filter getters ────────────────────────────────────────────

  describe('gate group getters', () => {
    beforeEach(() => {
      component.kybResult = {
        company_registry_verified: true, director_verification_matched: true,
        ubo_identification_declared: true, sanctions_match: false, pep_identified: false,
        kyc_identity_verified: true, adverse_media_found: false
      };
    });

    it('docGates contains Gate 1 and Gate 2', () => {
      const names = component.docGates.map(g => g.name);
      expect(names.some(n => n.includes('Gate 1'))).toBeTrue();
      expect(names.some(n => n.includes('Gate 2'))).toBeTrue();
    });

    it('registryGates contains Gates 3, 4, 5', () => {
      expect(component.registryGates.length).toBe(3);
    });

    it('pepGates contains Gate 6', () => {
      expect(component.pepGates.length).toBe(1);
      expect(component.pepGates[0].name).toContain('Gate 6');
    });

    it('kycGates contains Gate 7', () => {
      expect(component.kycGates.length).toBe(1);
    });

    it('amlGates contains Gate 8', () => {
      expect(component.amlGates.length).toBe(1);
    });
  });

  // ── decisionColor ─────────────────────────────────────────────────────────

  describe('decisionColor', () => {
    it('returns green for APPROVED', () => {
      component.kybResult = { onboarding_decision: 'APPROVED' };
      expect(component.decisionColor).toBe('#22c55e');
    });

    it('returns red for REJECTED', () => {
      component.kybResult = { onboarding_decision: 'REJECTED' };
      expect(component.decisionColor).toBe('#ef4444');
    });

    it('returns amber for MANUAL_REVIEW', () => {
      component.kybResult = { onboarding_decision: 'MANUAL_REVIEW' };
      expect(component.decisionColor).toBe('#f59e0b');
    });

    it('returns blue for CONDITIONS', () => {
      component.kybResult = { onboarding_decision: 'CONDITIONS' };
      expect(component.decisionColor).toBe('#3b82f6');
    });

    it('returns grey for unknown decision', () => {
      component.kybResult = { onboarding_decision: 'SOMETHING_ELSE' };
      expect(component.decisionColor).toBe('#94a3b8');
    });
  });

  // ── decisionIcon ──────────────────────────────────────────────────────────

  describe('decisionIcon', () => {
    it('shows ✅ for APPROVED', () => {
      component.kybResult = { onboarding_decision: 'APPROVED' };
      expect(component.decisionIcon).toBe('✅');
    });

    it('shows ❌ for REJECTED', () => {
      component.kybResult = { onboarding_decision: 'REJECTED' };
      expect(component.decisionIcon).toBe('❌');
    });

    it('shows ⚠️ for MANUAL_REVIEW', () => {
      component.kybResult = { onboarding_decision: 'MANUAL_REVIEW' };
      expect(component.decisionIcon).toContain('⚠');
    });
  });

  // ── riskScoreNarrative ────────────────────────────────────────────────────

  describe('riskScoreNarrative', () => {
    it('returns empty string when kybResult is null', () => {
      component.kybResult = null;
      expect(component.riskScoreNarrative).toBe('');
    });

    it('returns empty string when computedRiskScore is null', () => {
      component.kybResult = { entity_name: 'Test' };
      expect(component.riskScoreNarrative).toBe('');
    });

    it('starts with "Low risk" for score ≤ 20', () => {
      component.kybResult = {
        overall_risk_score: 15,
        company_registry_verified: true,
        director_verification_matched: true,
        sanctions_match: false, pep_identified: false,
        kyc_identity_verified: true, kyc_identity_decision: 'GREEN',
        adverse_media_found: false
      };
      expect(component.riskScoreNarrative).toMatch(/^Low risk/);
    });

    it('starts with "Moderate risk" for score 21-40', () => {
      component.kybResult = {
        overall_risk_score: 35,
        company_registry_verified: true,
        director_verification_matched: true,
        sanctions_match: false, pep_identified: false,
        adverse_media_found: false
      };
      expect(component.riskScoreNarrative).toMatch(/^Moderate risk/);
    });

    it('starts with "Elevated risk" for score 41-65', () => {
      component.kybResult = {
        overall_risk_score: 55,
        company_registry_verified: false,
        director_verification_matched: false,
        sanctions_match: false, pep_identified: true,
        adverse_media_found: false
      };
      expect(component.riskScoreNarrative).toMatch(/^Elevated risk/);
    });

    it('starts with "High risk" for score > 65', () => {
      component.kybResult = {
        overall_risk_score: 80,
        company_registry_verified: false,
        director_verification_matched: false,
        sanctions_match: true, pep_identified: false,
        adverse_media_found: true
      };
      expect(component.riskScoreNarrative).toMatch(/^High risk/);
    });

    it('includes "SANCTIONED" when sanctions_match is true', () => {
      component.kybResult = {
        overall_risk_score: 90,
        sanctions_match: true, pep_identified: false,
        adverse_media_found: false
      };
      expect(component.riskScoreNarrative).toContain('SANCTIONED');
    });

    it('includes "PEP identified" when pep_identified is true', () => {
      component.kybResult = {
        overall_risk_score: 40,
        sanctions_match: false, pep_identified: true,
        adverse_media_found: false
      };
      expect(component.riskScoreNarrative).toContain('PEP identified');
    });

    it('includes "no adverse media" when adverse_media_found is false', () => {
      component.kybResult = {
        overall_risk_score: 20,
        sanctions_match: false, pep_identified: false,
        adverse_media_found: false
      };
      expect(component.riskScoreNarrative).toContain('no adverse media');
    });

    it('includes "adverse media flagged" when adverse_media_found is true', () => {
      component.kybResult = {
        overall_risk_score: 50,
        sanctions_match: false, pep_identified: false,
        adverse_media_found: true, aml_risk_score: 12
      };
      expect(component.riskScoreNarrative).toContain('adverse media flagged');
      expect(component.riskScoreNarrative).toContain('12/20');
    });

    it('includes KYC GREEN decision in narrative', () => {
      component.kybResult = {
        overall_risk_score: 18,
        sanctions_match: false, pep_identified: false,
        adverse_media_found: false,
        kyc_identity_decision: 'GREEN', kyc_identity_confidence: 0.97
      };
      expect(component.riskScoreNarrative).toContain('KYC GREEN');
    });
  });

  // ── confirmAndVerify validation ───────────────────────────────────────────

  describe('confirmAndVerify() — client-side validation', () => {
    it('sets reviewErrors when companyName is empty', () => {
      component.reviewData = {
        companyName: '',
        registrationNumber: '12345678',
        incorporationDate: '',
        registeredAddress: '',
        jurisdiction: 'England & Wales',
        companyType: 'Private Limited Company',
        directors: [{ fullName: 'John Smith', dob: '', nationality: '', idType: 'Passport', idNumber: '' }],
        ubos: [],
        sourceOfFunds: ''
      };
      component.confirmAndVerify();
      expect(component.reviewErrors.some(e => e.includes('Company name'))).toBeTrue();
    });

    it('sets reviewErrors when registrationNumber is empty', () => {
      component.reviewData = {
        companyName: 'Test Corp Ltd',
        registrationNumber: '',
        incorporationDate: '',
        registeredAddress: '',
        jurisdiction: 'England & Wales',
        companyType: 'Private Limited Company',
        directors: [{ fullName: 'John Smith', dob: '', nationality: '', idType: 'Passport', idNumber: '' }],
        ubos: [],
        sourceOfFunds: ''
      };
      component.confirmAndVerify();
      expect(component.reviewErrors.some(e => e.includes('registration number'))).toBeTrue();
    });

    it('sets reviewErrors when all directors have empty names', () => {
      component.reviewData = {
        companyName: 'Test Corp Ltd',
        registrationNumber: '12345678',
        incorporationDate: '',
        registeredAddress: '',
        jurisdiction: 'England & Wales',
        companyType: 'Private Limited Company',
        directors: [{ fullName: '', dob: '', nationality: '', idType: 'Passport', idNumber: '' }],
        ubos: [],
        sourceOfFunds: ''
      };
      component.confirmAndVerify();
      expect(component.reviewErrors.some(e => e.includes('director'))).toBeTrue();
    });
  });

  // ── startNew ──────────────────────────────────────────────────────────────

  describe('startNew()', () => {
    it('clears all state', () => {
      component.kybResult   = { entity_name: 'Test' };
      component.kybError    = 'Some error';
      component.entityName  = 'Alpha Corp';
      component.entityType  = 'Private Limited Company';
      component.jurisdiction = 'England & Wales';

      component.startNew();

      expect(component.kybResult).toBeNull();
      expect(component.kybError).toBeNull();
      expect(component.entityName).toBe('');
      expect(component.entityType).toBe('');
      expect(component.jurisdiction).toBe('');
    });
  });

  // ── allPassed / passCount ─────────────────────────────────────────────────

  describe('slot state counts', () => {
    it('allPassed is false when no slots have results', () => {
      expect(component.allPassed).toBeFalse();
    });

    it('uploadedCount reflects slots with files', () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      component.slots[0].file = mockFile;
      expect(component.uploadedCount).toBe(1);
    });
  });
});
