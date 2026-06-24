import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AlertCardComponent } from './alert-card.component';
import { ImpactBadgeComponent } from '../impact-badge/impact-badge.component';

describe('AlertCardComponent', () => {
  let fixture: ComponentFixture<AlertCardComponent>;
  let component: AlertCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AlertCardComponent, ImpactBadgeComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(AlertCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── isUrl ──────────────────────────────────────────────────────────────────

  describe('isUrl()', () => {
    it('returns true for http URL', () => {
      expect(component.isUrl('http://example.com')).toBeTrue();
    });

    it('returns true for https URL', () => {
      expect(component.isUrl('https://fca.org.uk/news')).toBeTrue();
    });

    it('returns false for non-URL string', () => {
      expect(component.isUrl('just a reference')).toBeFalse();
    });

    it('returns false for empty string', () => {
      expect(component.isUrl('')).toBeFalse();
    });

    it('returns falsy for undefined (optional chaining returns undefined)', () => {
      expect(component.isUrl(undefined as any)).toBeFalsy();
    });
  });

  // ── Template rendering ─────────────────────────────────────────────────────

  it('renders bank_name as entity', () => {
    component.alert = { bank_name: 'HSBC', impact_level: 'high', summary: 'Rate change', recommended_action: 'Review' };
    fixture.detectChanges();
    const entity: HTMLElement = fixture.nativeElement.querySelector('.entity');
    expect(entity.textContent).toContain('HSBC');
  });

  it('falls back to "Alert" when no entity identifier is present', () => {
    component.alert = { impact_level: 'low', summary: 'Generic', recommended_action: 'None' };
    fixture.detectChanges();
    const entity: HTMLElement = fixture.nativeElement.querySelector('.entity');
    expect(entity.textContent).toContain('Alert');
  });

  it('renders summary text', () => {
    component.alert = { bank_name: 'Barclays', summary: 'GBP rate updated', impact_level: 'medium', recommended_action: 'Monitor' };
    fixture.detectChanges();
    const summary: HTMLElement = fixture.nativeElement.querySelector('.summary');
    expect(summary.textContent).toContain('GBP rate updated');
  });

  it('shows Source link when source_reference is a URL', () => {
    component.alert = {
      bank_name: 'NatWest', impact_level: 'low', summary: 'Minor update', recommended_action: 'None',
      source_reference: 'https://natwest.com/news'
    };
    fixture.detectChanges();
    const link: HTMLElement = fixture.nativeElement.querySelector('.source-link');
    expect(link).toBeTruthy();
  });

  it('hides Source link when source_reference is not a URL', () => {
    component.alert = {
      bank_name: 'Lloyds', impact_level: 'low', summary: 'Update', recommended_action: 'None',
      source_reference: 'Internal reference only'
    };
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('.source-link');
    expect(link).toBeNull();
  });

  it('shows confidence as percentage', () => {
    component.alert = { bank_name: 'HSBC', impact_level: 'high', summary: 'X', recommended_action: 'Y', confidence_score: 0.92 };
    fixture.detectChanges();
    const conf: HTMLElement = fixture.nativeElement.querySelector('.confidence');
    expect(conf.textContent).toContain('92%');
  });

  it('shows compliance deadline when present', () => {
    component.alert = { bank_name: 'Barclays', impact_level: 'critical', summary: 'Mandatory update', recommended_action: 'Act now', compliance_deadline: '2026-12-31' };
    fixture.detectChanges();
    const deadline: HTMLElement = fixture.nativeElement.querySelector('.deadline');
    expect(deadline.textContent).toContain('2026-12-31');
  });

  it('applies critical border class for critical impact', () => {
    component.alert = { bank_name: 'Test', impact_level: 'critical', summary: 'X', recommended_action: 'Y' };
    fixture.detectChanges();
    const card: HTMLElement = fixture.nativeElement.querySelector('.alert-card');
    expect(card.classList).toContain('border-critical');
  });
});
