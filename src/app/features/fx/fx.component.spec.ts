import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { FxComponent } from './fx.component';
import { LyzrAgentService } from '../../core/services/lyzr-agent.service';

describe('FxComponent', () => {
  let component: FxComponent;
  let fixture: ComponentFixture<FxComponent>;
  let lyzrSpy: jasmine.SpyObj<LyzrAgentService>;

  beforeEach(async () => {
    lyzrSpy = jasmine.createSpyObj('LyzrAgentService', ['callAgent', 'parseJSON']);

    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [FxComponent],
      providers: [{ provide: LyzrAgentService, useValue: lyzrSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(FxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('has 5 currency pairs in quick-check list', () => {
    expect(component.pairs.length).toBe(5);
    expect(component.pairs).toContain('GBP/USD');
  });

  // ── check() ───────────────────────────────────────────────────────────────

  describe('check()', () => {
    it('builds message with quoted rate when provided', () => {
      lyzrSpy.callAgent.and.returnValue(of({ response: '{}', session_id: 's1' }));
      lyzrSpy.parseJSON.and.returnValue({ currency_pair: 'GBP/USD', impact_level: 'low' });

      component.pair = 'GBP/USD';
      component.quotedRate = '1.2618';
      component.check();

      const msg = lyzrSpy.callAgent.calls.mostRecent().args[1] as string;
      expect(msg).toContain('1.2618');
      expect(msg).toContain('GBP/USD');
    });

    it('builds shorter message when no quoted rate', () => {
      lyzrSpy.callAgent.and.returnValue(of({ response: '{}', session_id: 's1' }));
      lyzrSpy.parseJSON.and.returnValue(null);

      component.pair = 'GBP/EUR';
      component.quotedRate = '';
      component.check();

      const msg = lyzrSpy.callAgent.calls.mostRecent().args[1] as string;
      expect(msg).not.toContain('quoted rate');
    });

    it('sets parsed result on successful JSON response', () => {
      const mockParsed = { currency_pair: 'GBP/USD', impact_level: 'medium', hsbc_rate: 1.2618 };
      lyzrSpy.callAgent.and.returnValue(of({ response: '{}', session_id: 's1' }));
      lyzrSpy.parseJSON.and.returnValue(mockParsed);

      component.pair = 'GBP/USD';
      component.check();

      expect(component.parsed).toEqual(mockParsed);
      expect(component.loading).toBeFalse();
    });

    it('sets plain response when JSON parse fails', () => {
      lyzrSpy.callAgent.and.returnValue(of({ response: 'Rate is 1.2618', session_id: 's1' }));
      lyzrSpy.parseJSON.and.returnValue(null);

      component.pair = 'GBP/USD';
      component.check();

      expect(component.parsed).toBeNull();
      expect(component.response).toBe('Rate is 1.2618');
    });

    it('sets error message on API failure', () => {
      lyzrSpy.callAgent.and.returnValue(throwError(() => new Error('Timeout')));

      component.pair = 'GBP/USD';
      component.check();

      expect(component.error).toContain('Timeout');
      expect(component.loading).toBeFalse();
    });
  });

  // ── quickCheck() ──────────────────────────────────────────────────────────

  describe('quickCheck()', () => {
    it('sets pair and default rate for GBP/USD', () => {
      lyzrSpy.callAgent.and.returnValue(of({ response: '{}', session_id: 's1' }));
      lyzrSpy.parseJSON.and.returnValue(null);

      component.quickCheck('GBP/USD');

      expect(component.pair).toBe('GBP/USD');
      expect(component.quotedRate).toBe('1.2618');
    });

    it('sets pair and default rate for GBP/EUR', () => {
      lyzrSpy.callAgent.and.returnValue(of({ response: '{}', session_id: 's1' }));
      lyzrSpy.parseJSON.and.returnValue(null);

      component.quickCheck('GBP/EUR');

      expect(component.pair).toBe('GBP/EUR');
      expect(component.quotedRate).toBe('1.1685');
    });

    it('sets empty rate for unknown pair', () => {
      lyzrSpy.callAgent.and.returnValue(of({ response: '{}', session_id: 's1' }));
      lyzrSpy.parseJSON.and.returnValue(null);

      component.quickCheck('AUD/CAD');

      expect(component.pair).toBe('AUD/CAD');
      expect(component.quotedRate).toBe('');
    });

    it('calls check() after setting values', () => {
      lyzrSpy.callAgent.and.returnValue(of({ response: '{}', session_id: 's1' }));
      lyzrSpy.parseJSON.and.returnValue(null);

      component.quickCheck('GBP/JPY');

      expect(lyzrSpy.callAgent).toHaveBeenCalled();
    });
  });
});
