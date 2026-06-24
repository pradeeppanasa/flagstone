import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { SettlementComponent } from './settlement.component';
import { LyzrAgentService } from '../../core/services/lyzr-agent.service';
import { ImpactBadgeComponent } from '../../shared/components/impact-badge/impact-badge.component';

describe('SettlementComponent', () => {
  let component: SettlementComponent;
  let fixture: ComponentFixture<SettlementComponent>;
  let lyzrSpy: jasmine.SpyObj<LyzrAgentService>;

  beforeEach(async () => {
    lyzrSpy = jasmine.createSpyObj('LyzrAgentService', ['callAgent', 'parseJSON']);

    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [SettlementComponent, ImpactBadgeComponent],
      providers: [{ provide: LyzrAgentService, useValue: lyzrSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(SettlementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('has 5 preset test cases', () => {
    expect(component.testCases.length).toBe(5);
  });

  it('initial state: no alerts, not loading', () => {
    expect(component.alerts).toEqual([]);
    expect(component.loading).toBeFalse();
    expect(component.error).toBeNull();
  });

  // ── analyseException ──────────────────────────────────────────────────────

  describe('analyseException()', () => {
    it('prepends parsed alert to alerts list on success', () => {
      const mockAlert = {
        exception_id: 'EXC-001', exception_type: 'failed_leg',
        currency_pair: 'GBP/USD', amount: 1500000, base_currency: 'GBP',
        severity: 'critical' as const, summary: 'USD leg not received',
        timeline: '10:30 GMT', resolution_attempted: '', resolution_status: 'escalated' as const,
        recommended_action: 'Escalate to treasury', escalate_to: ['treasury'], confidence_score: 0.9
      };
      lyzrSpy.callAgent.and.returnValue(of({ response: '{}', session_id: 's1' }));
      lyzrSpy.parseJSON.and.returnValue(mockAlert);

      component.exceptionInput = 'GBP/USD leg failed';
      component.analyseException();

      expect(component.alerts.length).toBe(1);
      expect(component.alerts[0].exception_id).toBe('EXC-001');
      expect(component.alerts[0].severity).toBe('critical');
    });

    it('adds plain-text fallback when JSON parse fails', () => {
      lyzrSpy.callAgent.and.returnValue(of({ response: 'Exception noted', session_id: 's1' }));
      lyzrSpy.parseJSON.and.returnValue(null);

      component.exceptionInput = 'Some exception';
      component.analyseException();

      expect(component.alerts.length).toBe(1);
      expect(component.alerts[0].summary).toBe('Exception noted');
    });

    it('sets error on failure', () => {
      lyzrSpy.callAgent.and.returnValue(throwError(() => new Error('Timeout')));

      component.exceptionInput = 'Exception description';
      component.analyseException();

      expect(component.error).toContain('Timeout');
      expect(component.loading).toBeFalse();
    });
  });

  // ── runTest ────────────────────────────────────────────────────────────────

  describe('runTest()', () => {
    it('sets exceptionInput from test case prompt and calls analyseException', () => {
      lyzrSpy.callAgent.and.returnValue(of({ response: '{}', session_id: 's1' }));
      lyzrSpy.parseJSON.and.returnValue(null);

      const tc = component.testCases[0];
      component.runTest(tc);

      expect(component.exceptionInput).toBe(tc.prompt);
      expect(lyzrSpy.callAgent).toHaveBeenCalled();
    });
  });
});
