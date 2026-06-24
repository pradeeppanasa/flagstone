import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ImpactBadgeComponent } from './impact-badge.component';

describe('ImpactBadgeComponent', () => {
  let fixture: ComponentFixture<ImpactBadgeComponent>;
  let component: ImpactBadgeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ImpactBadgeComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(ImpactBadgeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('defaults level to "unknown"', () => {
    fixture.detectChanges();
    expect(component.level).toBe('unknown');
  });

  it('renders badge with "unknown" class by default', () => {
    fixture.detectChanges();
    const span: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(span.classList).toContain('badge-unknown');
  });

  it('renders "CRITICAL" text for critical level', () => {
    component.level = 'critical';
    fixture.detectChanges();
    const span: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(span.textContent?.trim()).toBe('CRITICAL');
    expect(span.classList).toContain('badge-critical');
  });

  it('renders "HIGH" text for high level', () => {
    component.level = 'high';
    fixture.detectChanges();
    const span: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(span.textContent?.trim()).toBe('HIGH');
    expect(span.classList).toContain('badge-high');
  });

  it('renders "MEDIUM" for medium level', () => {
    component.level = 'medium';
    fixture.detectChanges();
    const span: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(span.textContent?.trim()).toBe('MEDIUM');
  });

  it('renders "LOW" for low level', () => {
    component.level = 'low';
    fixture.detectChanges();
    const span: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(span.classList).toContain('badge-low');
  });
});
