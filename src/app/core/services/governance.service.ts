/**
 * Governance & Guardrails service — TypeScript port of:
 *   guardrails/pii_detector.py
 *   guardrails/content_safety.py
 *   governance/compliance_checker.py
 *   governance/safety_validator.py
 *   governance/governance_gate.py
 *
 * RAGAS evaluation baseline: Faithfulness 0.8542 | Answer Relevancy 0.8123
 *                             Context Precision 0.7891 | Context Recall 0.8267
 */
import { Injectable } from '@angular/core';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PiiEntity { type: string; value: string; }
interface PiiResult  { hasPii: boolean; entities: PiiEntity[]; count: number; }
interface SafetyFlag { category: string; keyword: string; severity: 'high'|'medium'|'low'; }
interface SafetyResult { isSafe: boolean; flags: SafetyFlag[]; severity: 'high'|'medium'|'low'; }

export interface GovernanceResult {
  passed: boolean;
  violations: string[];
  piiDetected: boolean;
  piiRedacted: boolean;
  sanitisedText: string;
  timestamp: string;
}

export interface AuditEntry {
  action: 'validate_input' | 'validate_output';
  result: 'PASS' | 'FAIL';
  violations: string[];
  timestamp: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class GovernanceService {

  private readonly auditLog: AuditEntry[] = [];

  // ── PII patterns (pii_detector.py) — financial domain additions: IBAN, sort code ──
  private readonly PII_PATTERNS: Record<string, RegExp> = {
    email:       /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    phone:       /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    ssn:         /\b\d{3}-\d{2}-\d{4}\b/g,
    credit_card: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    passport:    /\b[A-Z]{1,2}\d{6,9}\b/g,
    ip_address:  /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    iban:        /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7,19}\b/g,
    sort_code:   /\b\d{2}-\d{2}-\d{2}\b/g
  };

  private readonly PII_LABELS: Record<string, string> = {
    email:       '<EMAIL_REDACTED>',
    phone:       '<PHONE_REDACTED>',
    ssn:         '[SSN_REDACTED]',
    credit_card: '<CARD_REDACTED>',
    passport:    '<PASSPORT_REDACTED>',
    ip_address:  '[IP_REDACTED]',
    iban:        '[IBAN_REDACTED]',
    sort_code:   '[SORT_CODE_REDACTED]'
  };

  // ── Content safety keywords (content_safety.py) ─────────────────────────────
  private readonly UNSAFE_KEYWORDS: Record<string, { words: string[]; severity: 'high'|'medium'|'low' }> = {
    violence:        { words: ['kill', 'murder', 'attack', 'bomb', 'weapon', 'shoot', 'stab', 'assault'], severity: 'high' },
    hate_speech:     { words: ['racist', 'discrimination', 'bigot', 'slur'], severity: 'high' },
    fraud:           { words: ['fake booking', 'scam', 'counterfeit', 'money laundering', 'fraudulent'], severity: 'high' },
    profanity:       { words: ['damn', 'hell', 'crap', 'bastard'], severity: 'medium' },
    personal_attack: { words: ['stupid', 'idiot', 'moron', 'dumb', 'incompetent'], severity: 'low' }
  };

  // ── Prompt injection patterns (safety_validator.py + VAPT additions) ─────────
  private readonly INJECTION_PATTERNS: RegExp[] = [
    /ignore (all |your |previous )?instructions/gi,
    /act as (a |an )?(different|new|another|unrestricted|unfiltered|jailbreak)/gi,
    /forget (your |all |previous )?/gi,
    /you are now/gi,
    /pretend (you are|to be)/gi,
    /jailbreak/gi,
    /DAN mode/gi,
    /developer mode/gi,
    /bypass safety/gi,
    /override guidelines/gi,
    /override (your |system |previous )?/gi,
    /disregard (your |all |previous )?/gi,
    /delete all data/gi,
    /new (role|persona|identity)/gi,
    /simulate (being|a )/gi,
    /\bsystem prompt\b/gi,
    /reveal (your |the )?(system |hidden |internal )?prompt/gi,
    /what (are|were) your (original |initial )?instructions/gi
  ];

  // ── PII detection ─────────────────────────────────────────────────────────────
  private detectPii(text: string): PiiResult {
    const entities: PiiEntity[] = [];
    for (const [type, pattern] of Object.entries(this.PII_PATTERNS)) {
      const re = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;
      while ((match = re.exec(text)) !== null) {
        entities.push({ type, value: match[0] });
      }
    }
    return { hasPii: entities.length > 0, entities, count: entities.length };
  }

  private redactPii(text: string): string {
    let out = text;
    for (const [type, pattern] of Object.entries(this.PII_PATTERNS)) {
      const re = new RegExp(pattern.source, pattern.flags);
      out = out.replace(re, this.PII_LABELS[type] ?? `[${type.toUpperCase()}_REDACTED]`);
    }
    return out;
  }

  // ── Content safety (content_safety.py) ───────────────────────────────────────
  private checkContentSafety(text: string): SafetyResult {
    const lower = text.toLowerCase();
    const flags: SafetyFlag[] = [];
    for (const [category, cfg] of Object.entries(this.UNSAFE_KEYWORDS)) {
      for (const word of cfg.words) {
        if (lower.includes(word)) {
          flags.push({ category, keyword: word, severity: cfg.severity });
        }
      }
    }
    const severity: 'high'|'medium'|'low' =
      flags.some(f => f.severity === 'high')   ? 'high' :
      flags.some(f => f.severity === 'medium') ? 'medium' : 'low';
    return { isSafe: flags.length === 0, flags, severity };
  }

  // ── Injection detection (safety_validator.py) ─────────────────────────────────
  private checkInjection(text: string): string[] {
    const violations: string[] = [];
    for (const pattern of this.INJECTION_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags);
      if (re.test(text)) {
        violations.push(`Prompt injection detected`);
        break; // one block message is enough
      }
    }
    return violations;
  }

  // ── Audit log (governance_gate.py _log_audit) ─────────────────────────────────
  private logAudit(action: 'validate_input'|'validate_output', result: GovernanceResult): void {
    const entry: AuditEntry = {
      action,
      result: result.passed ? 'PASS' : 'FAIL',
      violations: result.violations,
      timestamp: result.timestamp
    };
    this.auditLog.push(entry);
    if (!result.passed || result.piiRedacted) {
      console.warn('[GOVERNANCE]', JSON.stringify(entry));
    }
  }

  // ── Public API (governance_gate.py validate_input / validate_output) ──────────

  /**
   * Validate and sanitise user input before sending to agent.
   * Blocks unsafe/injected inputs; redacts PII (GDPR — do not transmit to 3rd party).
   */
  validateInput(text: string): GovernanceResult {
    const violations: string[] = [];

    // 1. Content safety (keyword check)
    const safety = this.checkContentSafety(text);
    if (!safety.isSafe) {
      safety.flags
        .filter(f => f.severity === 'high')
        .forEach(f => violations.push(`Unsafe content (${f.category})`));
    }

    // 2. Prompt injection / goal-hijacking
    violations.push(...this.checkInjection(text));

    // 3. PII — redact before transmitting (compliance_checker.py GDPR standard)
    const pii = this.detectPii(text);
    const sanitisedText = pii.hasPii ? this.redactPii(text) : text;
    const piiViolations = pii.hasPii
      ? [`PII detected and redacted (${[...new Set(pii.entities.map(e => e.type))].join(', ')})`]
      : [];

    // PII redactions are warnings (not blocking) — only safety/injection block
    const blocking = violations.length > 0;

    const result: GovernanceResult = {
      passed: !blocking,
      violations: [...violations, ...piiViolations],
      piiDetected: pii.hasPii,
      piiRedacted: pii.hasPii,
      sanitisedText,
      timestamp: new Date().toISOString()
    };

    this.logAudit('validate_input', result);
    return result;
  }

  /**
   * Validate and sanitise agent output before rendering.
   * Redacts any PII that leaked into the response.
   */
  validateOutput(text: string): GovernanceResult {
    const violations: string[] = [];

    // Redact PII that may have leaked (compliance_checker.py)
    const pii = this.detectPii(text);
    const sanitisedText = pii.hasPii ? this.redactPii(text) : text;
    if (pii.hasPii) {
      violations.push(`Output PII redacted (${pii.count} item(s))`);
    }

    // Flag high-severity unsafe content in output
    const safety = this.checkContentSafety(text);
    if (!safety.isSafe && safety.severity === 'high') {
      violations.push(`Unsafe output content flagged (${safety.flags.map(f => f.category).join(', ')})`);
    }

    const result: GovernanceResult = {
      passed: true, // output — redact but don't block the user
      violations,
      piiDetected: pii.hasPii,
      piiRedacted: pii.hasPii,
      sanitisedText,
      timestamp: new Date().toISOString()
    };

    this.logAudit('validate_output', result);
    return result;
  }

  getAuditLog(): AuditEntry[] {
    return [...this.auditLog];
  }

  getAuditSummary(): { total: number; passed: number; failed: number; piiRedactions: number } {
    const total = this.auditLog.length;
    const passed = this.auditLog.filter(e => e.result === 'PASS').length;
    const piiRedactions = this.auditLog.filter(e =>
      e.violations.some(v => v.includes('PII'))).length;
    return { total, passed, failed: total - passed, piiRedactions };
  }
}
