import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { RegulatoryComponent } from './regulatory-contracts.component';
import { LyzrAgentService } from '../../core/services/lyzr-agent.service';

describe('RegulatoryComponent', () => {
  let component: RegulatoryComponent;
  let fixture: ComponentFixture<RegulatoryComponent>;
  let lyzrSpy: jasmine.SpyObj<LyzrAgentService>;

  beforeEach(async () => {
    lyzrSpy = jasmine.createSpyObj('LyzrAgentService', ['callAgent', 'parseJSON']);

    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [RegulatoryComponent],
      providers: [{ provide: LyzrAgentService, useValue: lyzrSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(RegulatoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('initial state: no response, no error, not loading', () => {
    expect(component.response).toBe('');
    expect(component.error).toBeNull();
    expect(component.loading).toBeFalse();
    expect(component.parsed).toBeNull();
  });

  it('sets parsed result on successful JSON response', () => {
    const mockAlert = { regulator: 'FCA', impact_level: 'high', summary: 'New EMI rules' };
    lyzrSpy.callAgent.and.returnValue(of({ response: '{}', session_id: 's1' }));
    lyzrSpy.parseJSON.and.returnValue(mockAlert);

    component.displayQuery = 'FCA EMI 2026';
    (component as any).searchFreeText();

    expect(component.parsed).toEqual(mockAlert);
    expect(component.loading).toBeFalse();
  });

  it('sets plain text response when JSON parse fails', () => {
    lyzrSpy.callAgent.and.returnValue(of({ response: 'FCA released new rules', session_id: 's1' }));
    lyzrSpy.parseJSON.and.returnValue(null);

    component.displayQuery = 'FCA';
    (component as any).searchFreeText();

    expect(component.response).toBe('FCA released new rules');
    expect(component.parsed).toBeNull();
  });

  it('sets error on API failure', () => {
    lyzrSpy.callAgent.and.returnValue(throwError(() => new Error('Network error')));

    component.displayQuery = 'PCI-DSS';
    (component as any).searchFreeText();

    expect(component.error).toContain('Network error');
    expect(component.loading).toBeFalse();
  });
});
