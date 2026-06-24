import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the sidebar', () => {
    const nav: HTMLElement = fixture.nativeElement.querySelector('nav.sidebar');
    expect(nav).toBeTruthy();
  });

  it('should display brand name "Panasa"', () => {
    const brand: HTMLElement = fixture.nativeElement.querySelector('.brand-name');
    expect(brand.textContent).toContain('Panasa');
  });

  it('should contain KYC/KYB navigation link', () => {
    const links: NodeList = fixture.nativeElement.querySelectorAll('a');
    const texts = Array.from(links).map((l: any) => l.textContent);
    expect(texts.some(t => t.includes('KYC'))).toBeTrue();
  });

  it('should contain Dashboard navigation link', () => {
    const links: NodeList = fixture.nativeElement.querySelectorAll('a');
    const texts = Array.from(links).map((l: any) => l.textContent);
    expect(texts.some(t => t.includes('Dashboard'))).toBeTrue();
  });

  it('should render a router-outlet', () => {
    const outlet = fixture.nativeElement.querySelector('router-outlet');
    expect(outlet).toBeTruthy();
  });

  it('should show "Powered by Lyzr AI" footer', () => {
    const footer: HTMLElement = fixture.nativeElement.querySelector('.powered');
    expect(footer.textContent).toContain('Lyzr');
  });
});
