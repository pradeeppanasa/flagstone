import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-layout">
      <nav class="sidebar">
        <div class="sidebar-header">
          <div class="logo-wrap">
            <img src="assets/Panasa%20Tech%20Logo%20White.png" alt="Panasa" class="sidebar-logo" />
          </div>
          <div class="brand">
            <span class="brand-name">Panasa</span>
            <span class="brand-sub">Intelligence Platform</span>
          </div>
        </div>
        <ul class="nav-links">
          <li><a routerLink="/dashboard" routerLinkActive="active">
            <span class="nav-icon">⊞</span> Dashboard
          </a></li>
          <li><a routerLink="/fx" routerLinkActive="active">
            <span class="nav-icon">₤</span> FX Pricing
          </a></li>
          <li><a routerLink="/regulatory" routerLinkActive="active">
            <span class="nav-icon">⚖</span> Regulatory
          </a></li>
          <li><a routerLink="/settlement" routerLinkActive="active">
            <span class="nav-icon">⚡</span> Settlement
          </a></li>
          <li><a routerLink="/scheme-compliance" routerLinkActive="active">
            <span class="nav-icon">🃏</span> Scheme Compliance
          </a></li>
          <li><a routerLink="/kyc" routerLinkActive="active">
            <span class="nav-icon">🏢</span> KYC / KYB
          </a></li>
        </ul>
        <div class="sidebar-footer">
          <span class="powered">Powered by Lyzr AI</span>
        </div>
      </nav>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-layout { display: flex; height: 100vh; overflow: hidden; }

    /* Sidebar */
    .sidebar {
      width: 230px; color: white; display: flex; flex-direction: column; flex-shrink: 0;
      background: linear-gradient(180deg, #0d0f1a 0%, #111420 60%, #0a0c14 100%);
      box-shadow: 2px 0 16px rgba(0,0,0,0.6);
      border-right: 1px solid #1e2338;
    }
    .sidebar-header { padding: 22px 16px 18px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .logo-wrap { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .sidebar-logo { width: 48px; height: 48px; object-fit: contain; }
    .brand-name { display: block; font-weight: 700; font-size: 15px; letter-spacing: 0.3px; }
    .brand-sub { display: block; font-size: 10px; opacity: 0.5; margin-top: 2px; letter-spacing: 0.5px; text-transform: uppercase; }
    .nav-links { list-style: none; padding: 16px 0; margin: 0; flex: 1; }
    .nav-links li a { display: flex; align-items: center; gap: 10px; padding: 11px 18px; color: rgba(255,255,255,0.6); text-decoration: none; font-size: 13px; transition: all 0.2s; border-left: 3px solid transparent; }
    .nav-links li a:hover { background: rgba(245,197,66,0.07); color: rgba(255,255,255,0.9); border-left-color: rgba(245,197,66,0.3); }
    .nav-links li a.active { background: rgba(245,197,66,0.1); color: #f5c542; border-left-color: #f5c542; font-weight: 600; }
    .nav-icon { font-size: 15px; width: 20px; text-align: center; }
    .sidebar-footer { padding: 14px 18px; border-top: 1px solid rgba(255,255,255,0.08); }
    .powered { font-size: 10px; opacity: 0.3; letter-spacing: 0.5px; text-transform: uppercase; }

    /* Main content — dark */
    .main-content {
      flex: 1; overflow-y: auto;
      background-color: #0a0c14;
      background-image:
        radial-gradient(ellipse at 20% 20%, rgba(245,197,66,0.03) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 80%, rgba(59,130,246,0.03) 0%, transparent 60%);
    }
  `]
})
export class AppComponent {}
