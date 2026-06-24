import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { OnboardingComponent } from './onboarding.component';
import { LyzrAgentService } from '../../core/services/lyzr-agent.service';

describe('OnboardingComponent', () => {
  let component: OnboardingComponent;
  let fixture: ComponentFixture<OnboardingComponent>;
  let lyzrSpy: jasmine.SpyObj<LyzrAgentService>;

  beforeEach(async () => {
    lyzrSpy = jasmine.createSpyObj('LyzrAgentService', ['callAgent']);

    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [OnboardingComponent],
      providers: [{ provide: LyzrAgentService, useValue: lyzrSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('initial state: empty fields, not loading', () => {
    expect(component.entityName).toBe('');
    expect(component.loading).toBeFalse();
    expect(component.error).toBeNull();
    expect(component.response).toBe('');
  });

  it('assess() sets response on success', () => {
    lyzrSpy.callAgent.and.returnValue(of({ response: 'Case assessed: low risk', session_id: 's1' }));
    component.entityName = 'Alpha Capital Holdings Ltd';
    component.jurisdiction = 'Cayman Islands';
    component.documents = 'Certificate of Incorporation';

    (component as any).assess();

    expect(component.response).toBe('Case assessed: low risk');
    expect(component.loading).toBeFalse();
  });

  it('assess() sets error on failure', () => {
    lyzrSpy.callAgent.and.returnValue(throwError(() => new Error('Service unavailable')));
    component.entityName = 'Beta Fund Ltd';

    (component as any).assess();

    expect(component.error).toContain('Failed to connect');
    expect(component.loading).toBeFalse();
  });

  it('runTest() populates form fields and calls assess()', () => {
    lyzrSpy.callAgent.and.returnValue(of({ response: 'Assessed', session_id: 's1' }));

    (component as any).runTest('Alpha Capital Holdings Ltd', 'Cayman Islands', 'Certificate of Incorporation');

    expect(component.entityName).toBe('Alpha Capital Holdings Ltd');
    expect(component.jurisdiction).toBe('Cayman Islands');
    expect(lyzrSpy.callAgent).toHaveBeenCalled();
  });
});
