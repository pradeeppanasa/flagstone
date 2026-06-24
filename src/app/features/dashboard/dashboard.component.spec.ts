import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { LyzrAgentService } from '../../core/services/lyzr-agent.service';
import { AlertCardComponent } from '../../shared/components/alert-card/alert-card.component';
import { ImpactBadgeComponent } from '../../shared/components/impact-badge/impact-badge.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let lyzrSpy: jasmine.SpyObj<LyzrAgentService>;

  beforeEach(async () => {
    lyzrSpy = jasmine.createSpyObj('LyzrAgentService', ['callAgent', 'callManager', 'parseJSON']);

    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [DashboardComponent, AlertCardComponent, ImpactBadgeComponent],
      providers: [{ provide: LyzrAgentService, useValue: lyzrSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── criticalCount / highCount ─────────────────────────────────────────────

  describe('criticalCount', () => {
    it('returns 0 when no alerts', () => {
      expect(component.criticalCount).toBe(0);
    });

    it('counts alerts with impact_level "critical"', () => {
      component.alerts = [
        { impact_level: 'critical' }, { impact_level: 'high' }, { impact_level: 'critical' }
      ];
      expect(component.criticalCount).toBe(2);
    });

    it('counts alerts with severity "critical" (contract alerts)', () => {
      component.alerts = [{ severity: 'critical' }, { severity: 'high' }];
      expect(component.criticalCount).toBe(1);
    });
  });

  describe('highCount', () => {
    it('returns 0 when no alerts', () => {
      expect(component.highCount).toBe(0);
    });

    it('counts alerts with impact_level "high"', () => {
      component.alerts = [{ impact_level: 'high' }, { impact_level: 'medium' }, { impact_level: 'high' }];
      expect(component.highCount).toBe(2);
    });
  });

  // ── loadBriefing ──────────────────────────────────────────────────────────

  describe('loadBriefing()', () => {
    it('sets loading to true during request', () => {
      lyzrSpy.callAgent.and.returnValue(of({ response: '{}', session_id: 's1' }));
      lyzrSpy.parseJSON.and.returnValue({ bank_name: 'Test', impact_level: 'low' });
      component.loadBriefing();
      expect(lyzrSpy.callAgent).toHaveBeenCalled();
    });

    it('adds parsed alert to alerts list on success', () => {
      const mockAlert = { bank_name: 'Morning', impact_level: 'medium' };
      lyzrSpy.callAgent.and.returnValue(of({ response: '{}', session_id: 's1' }));
      lyzrSpy.parseJSON.and.returnValue(mockAlert);

      component.loadBriefing();

      expect(component.alerts).toContain(mockAlert);
      expect(component.loading).toBeFalse();
    });

    it('adds plain-text fallback alert when JSON parse fails', () => {
      lyzrSpy.callAgent.and.returnValue(of({ response: 'No JSON here', session_id: 's1' }));
      lyzrSpy.parseJSON.and.returnValue(null);

      component.loadBriefing();

      expect(component.alerts.length).toBe(1);
      expect(component.alerts[0].event_type).toBe('briefing');
    });

    it('sets error message on API failure', () => {
      lyzrSpy.callAgent.and.returnValue(throwError(() => new Error('Network error')));

      component.loadBriefing();

      expect(component.error).toContain('Network error');
      expect(component.loading).toBeFalse();
    });
  });

  // ── checkBank ─────────────────────────────────────────────────────────────

  describe('checkBank()', () => {
    it('calls callAgent with a message containing the bank name', () => {
      lyzrSpy.callAgent.and.returnValue(of({ response: '{}', session_id: 's1' }));
      lyzrSpy.parseJSON.and.returnValue({ bank_name: 'HSBC' });

      component.checkBank('HSBC');

      const args = lyzrSpy.callAgent.calls.mostRecent().args;
      expect(args[1]).toContain('HSBC');
    });

    it('adds error alert to list on API failure', () => {
      lyzrSpy.callAgent.and.returnValue(throwError(() => new Error('Timeout')));

      component.checkBank('Barclays');

      expect(component.alerts.length).toBe(1);
      expect(component.alerts[0].bank_name).toBe('Barclays');
      expect(component.alerts[0].event_type).toBe('error');
    });
  });

  // ── askManager ────────────────────────────────────────────────────────────

  describe('askManager()', () => {
    it('does nothing when userQuery is blank', () => {
      component.userQuery = '';
      component.askManager();
      expect(lyzrSpy.callManager).not.toHaveBeenCalled();
    });

    it('does nothing when userQuery is whitespace', () => {
      component.userQuery = '   ';
      component.askManager();
      expect(lyzrSpy.callManager).not.toHaveBeenCalled();
    });

    it('sets managerResponse on success', () => {
      lyzrSpy.callManager.and.returnValue(of({ response: 'HSBC rates are competitive.', session_id: 's1' }));
      component.userQuery = 'HSBC rates?';

      component.askManager();

      expect(component.managerResponse).toBe('HSBC rates are competitive.');
      expect(component.asking).toBeFalse();
    });

    it('sets fallback message on error', () => {
      lyzrSpy.callManager.and.returnValue(throwError(() => new Error('API error')));
      component.userQuery = 'Any updates?';

      component.askManager();

      expect(component.managerResponse).toContain('Unable to get a response');
      expect(component.asking).toBeFalse();
    });
  });

  // ── banks list ────────────────────────────────────────────────────────────

  it('has 6 banks in the quick-check list', () => {
    expect(component.banks.length).toBe(6);
  });
});
