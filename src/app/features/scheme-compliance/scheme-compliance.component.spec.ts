import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { SchemeComplianceComponent } from './scheme-compliance.component';
import { LyzrAgentService } from '../../core/services/lyzr-agent.service';

describe('SchemeComplianceComponent', () => {
  let component: SchemeComplianceComponent;
  let fixture: ComponentFixture<SchemeComplianceComponent>;
  let lyzrSpy: jasmine.SpyObj<LyzrAgentService>;

  beforeEach(async () => {
    lyzrSpy = jasmine.createSpyObj('LyzrAgentService', ['callAgent', 'parseJSON']);

    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [SchemeComplianceComponent],
      providers: [{ provide: LyzrAgentService, useValue: lyzrSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(SchemeComplianceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('initial state: no results, not loading', () => {
    expect(component.loading).toBeFalse();
    expect(component.parsed).toBeNull();
    expect(component.error).toBeNull();
  });

  it('sets parsed result on successful JSON response', () => {
    const mockResult = { scheme: 'Visa', severity: 'high', summary: 'New 3DS mandate' };
    lyzrSpy.callAgent.and.returnValue(of({ response: '{}', session_id: 's1' }));
    lyzrSpy.parseJSON.and.returnValue(mockResult);

    component.displayQuery = 'Visa scheme changes';
    (component as any).searchFreeText();

    expect(component.parsed).toEqual(mockResult);
    expect(component.loading).toBeFalse();
  });

  it('sets plain text response when JSON parse returns null', () => {
    lyzrSpy.callAgent.and.returnValue(of({ response: 'Visa scheme info', session_id: 's1' }));
    lyzrSpy.parseJSON.and.returnValue(null);

    component.displayQuery = 'Visa';
    (component as any).searchFreeText();

    expect(component.response).toBe('Visa scheme info');
  });

  it('sets error on API failure', () => {
    lyzrSpy.callAgent.and.returnValue(throwError(() => new Error('API Error')));

    component.displayQuery = 'Mastercard';
    (component as any).searchFreeText();

    expect(component.error).toContain('API Error');
    expect(component.loading).toBeFalse();
  });
});
