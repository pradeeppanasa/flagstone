import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { MonitorComponent } from './monitor.component';
import { LyzrAgentService } from '../../core/services/lyzr-agent.service';

describe('MonitorComponent', () => {
  let component: MonitorComponent;
  let fixture: ComponentFixture<MonitorComponent>;
  let lyzrSpy: jasmine.SpyObj<LyzrAgentService>;

  beforeEach(async () => {
    lyzrSpy = jasmine.createSpyObj('LyzrAgentService', ['callAgent']);

    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [MonitorComponent],
      providers: [{ provide: LyzrAgentService, useValue: lyzrSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(MonitorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('has 5 banks in quick-search list', () => {
    expect(component.banks.length).toBe(5);
    expect(component.banks).toContain('HSBC');
  });

  it('sets response on successful search', () => {
    lyzrSpy.callAgent.and.returnValue(of({ response: 'Rate changes found', session_id: 's1' }));

    component.query = 'HSBC rates';
    (component as any).search();

    expect(component.response).toBe('Rate changes found');
    expect(component.loading).toBeFalse();
  });

  it('sets error on search failure', () => {
    lyzrSpy.callAgent.and.returnValue(throwError(() => new Error('Network error')));

    component.query = 'Barclays';
    (component as any).search();

    expect(component.error).toContain('Network error');
    expect(component.loading).toBeFalse();
  });

  it('quickSearch sets query and triggers search', () => {
    lyzrSpy.callAgent.and.returnValue(of({ response: 'HSBC: no changes', session_id: 's1' }));

    (component as any).quickSearch('HSBC');

    expect(component.query).toContain('HSBC');
    expect(lyzrSpy.callAgent).toHaveBeenCalled();
  });
});
