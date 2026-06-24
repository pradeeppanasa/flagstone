import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LyzrAgentService } from './lyzr-agent.service';
import { GovernanceService } from './governance.service';
import { AgentResponse } from '../models/models';

describe('LyzrAgentService', () => {
  let service: LyzrAgentService;
  let httpMock: HttpTestingController;
  let governanceSpy: jasmine.SpyObj<GovernanceService>;

  const makePassResult = (text = 'clean text') => ({
    passed: true, sanitisedText: text, piiDetected: false, piiRedacted: false,
    violations: [], timestamp: new Date().toISOString()
  });

  beforeEach(() => {
    governanceSpy = jasmine.createSpyObj('GovernanceService', ['validateInput', 'validateOutput']);
    governanceSpy.validateInput.and.returnValue(makePassResult() as any);
    governanceSpy.validateOutput.and.callFake((text: string) => makePassResult(text) as any);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        LyzrAgentService,
        { provide: GovernanceService, useValue: governanceSpy }
      ]
    });
    service = TestBed.inject(LyzrAgentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ── parseJSON ────────────────────────────────────────────────────────────────

  describe('parseJSON', () => {
    it('parses direct JSON response', () => {
      const res: AgentResponse = { response: '{"key":"value"}', session_id: 's1' };
      expect(service.parseJSON<any>(res)).toEqual({ key: 'value' });
    });

    it('parses fenced code block ```json ... ```', () => {
      const res: AgentResponse = { response: '```json\n{"result":42}\n```', session_id: 's1' };
      expect(service.parseJSON<any>(res)).toEqual({ result: 42 });
    });

    it('parses fenced block without language tag', () => {
      const res: AgentResponse = { response: '```\n{"x":1}\n```', session_id: 's1' };
      expect(service.parseJSON<any>(res)).toEqual({ x: 1 });
    });

    it('extracts embedded JSON object from prose', () => {
      const res: AgentResponse = { response: 'The result is: {"status":"ok"} — done.', session_id: 's1' };
      expect(service.parseJSON<any>(res)).toEqual({ status: 'ok' });
    });

    it('returns null when response has no JSON', () => {
      const res: AgentResponse = { response: 'No JSON here at all', session_id: 's1' };
      expect(service.parseJSON<any>(res)).toBeNull();
    });

    it('returns null for malformed JSON', () => {
      const res: AgentResponse = { response: '{bad json}', session_id: 's1' };
      expect(service.parseJSON<any>(res)).toBeNull();
    });
  });

  // ── callAgent input validation ───────────────────────────────────────────────

  describe('callAgent — input validation', () => {
    it('rejects messages exceeding 1000 characters', (done) => {
      const longMsg = 'a'.repeat(1001);
      service.callAgent('agent1', longMsg).subscribe({
        error: (err) => {
          expect(err.message).toContain('1000');
          done();
        }
      });
    });

    it('passes a valid short message and makes an HTTP POST', () => {
      service.callAgent('agent1', 'short message').subscribe();
      const req = httpMock.expectOne(r => r.method === 'POST');
      req.flush({ response: '{"ok":true}', session_id: 's1' });
    });

    it('rejects when governance validateInput fails', (done) => {
      governanceSpy.validateInput.and.returnValue({ passed: false, sanitisedText: '', piiDetected: false, piiRedacted: false, violations: ['injection'] } as any);
      service.callAgent('agent1', 'inject me').subscribe({
        error: (err) => {
          expect(err.message).toContain('could not be processed');
          done();
        }
      });
    });

    it('strips XSS patterns from agent response', () => {
      const results: AgentResponse[] = [];
      service.callAgent('agent1', 'safe query').subscribe(r => results.push(r));

      const req = httpMock.expectOne(r => r.method === 'POST');
      req.flush({ response: '<script>alert(1)</script> clean', session_id: 's1' });

      expect(results.length).toBe(1);
      expect(results[0].response).toContain('[REMOVED]');
      expect(results[0].response).not.toContain('<script>');
    });

    it('handles server 500 error with user-friendly message', (done) => {
      service.callAgent('agent1', 'query').subscribe({
        error: (err) => {
          expect(err.message).toContain('went wrong');
          done();
        }
      });
      const req = httpMock.expectOne(r => r.method === 'POST');
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  // ── callAgentKyb ─────────────────────────────────────────────────────────────

  describe('callAgentKyb — input validation', () => {
    it('rejects messages exceeding 8000 characters', (done) => {
      const longMsg = 'x'.repeat(8001);
      service.callAgentKyb('kyb-agent', longMsg).subscribe({
        error: (err) => {
          expect(err.message).toContain('too long');
          done();
        }
      });
    });

    it('accepts messages within 8000 characters', () => {
      service.callAgentKyb('kyb-agent', 'valid KYB message').subscribe();
      const req = httpMock.expectOne(r => r.method === 'POST');
      req.flush({ response: '{}', session_id: 'kyb-1' });
    });

    it('returns 404-specific error for unknown agent', (done) => {
      service.callAgentKyb('bad-agent', 'msg').subscribe({
        error: (err) => {
          expect(err.message).toContain('404');
          done();
        }
      });
      const req = httpMock.expectOne(r => r.method === 'POST');
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });
  });

  // ── callAgentWithDocument ─────────────────────────────────────────────────────

  describe('callAgentWithDocument — input validation', () => {
    it('rejects prompt exceeding 4000 characters', (done) => {
      service.callAgentWithDocument('agent1', 'p'.repeat(4001), 'base64data', 'image/jpeg').subscribe({
        error: (err) => {
          expect(err.message).toContain('too long');
          done();
        }
      });
    });

    it('returns 429-specific error on rate limit response', (done) => {
      service.callAgentWithDocument('agent1', 'short prompt', 'b64', 'image/png').subscribe({
        error: (err) => {
          expect(err.message).toContain('Too many requests');
          done();
        }
      });
      const req = httpMock.expectOne(r => r.method === 'POST');
      req.flush('Rate limited', { status: 429, statusText: 'Too Many Requests' });
    });

    it('returns auth error for 401', (done) => {
      service.callAgentWithDocument('agent1', 'prompt', 'b64', 'image/png').subscribe({
        error: (err) => {
          expect(err.message).toContain('Authentication');
          done();
        }
      });
      const req = httpMock.expectOne(r => r.method === 'POST');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────────

  describe('rate limiting', () => {
    it('throws when the same agent is called twice within 3 seconds', (done) => {
      service.callAgent('rate-agent', 'first call').subscribe();
      httpMock.expectOne(r => r.method === 'POST').flush({ response: '{}', session_id: 's1' });

      service.callAgent('rate-agent', 'second call').subscribe({
        error: (err) => {
          expect(err.message).toContain('Too many requests');
          done();
        }
      });
    });
  });
});
