import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-layout">
      <nav class="sidebar">
        <div class="sidebar-header">
          <div class="logo-wrap">
            <img src="assets/panasa-logo.png" alt="Panasa" class="sidebar-logo" />
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
          <li class="nav-disabled">
            <span class="nav-icon">📊</span> Rate Monitor
          </li>
          <li class="nav-disabled">
            <span class="nav-icon">✓</span> Onboarding
          </li>
          <li><a routerLink="/fx" routerLinkActive="active">
            <span class="nav-icon">₤</span> FX Pricing
          </a></li>
          <li><a routerLink="/regulatory" routerLinkActive="active">
            <span class="nav-icon">⚖</span> Regulatory
          </a></li>
          <li class="nav-disabled">
            <span class="nav-icon">📄</span> Contracts
          </li>
          <li><a routerLink="/settlement" routerLinkActive="active">
            <span class="nav-icon">⚡</span> Settlement
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
    .sidebar { width: 220px; background: #1a3a5c; color: white; display: flex; flex-direction: column; flex-shrink: 0; }
    .sidebar-header { padding: 20px 16px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .logo-wrap { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .sidebar-logo { width: 44px; height: 44px; object-fit: contain; }
    .brand-name { display: block; font-weight: 700; font-size: 15px; }
    .brand-sub { display: block; font-size: 10px; opacity: 0.6; }
    .nav-links { list-style: none; padding: 12px 0; margin: 0; flex: 1; }
    .nav-links li a { display: flex; align-items: center; gap: 10px; padding: 10px 16px; color: rgba(255,255,255,0.7); text-decoration: none; font-size: 13px; transition: all 0.2s; }
    .nav-links li a:hover, .nav-links li a.active { background: rgba(255,255,255,0.1); color: white; border-left: 3px solid #2e75b6; }
    .nav-disabled { display: flex; align-items: center; gap: 10px; padding: 10px 16px; color: rgba(255,255,255,0.25); font-size: 13px; cursor: not-allowed; }
    .nav-icon { font-size: 14px; width: 18px; text-align: center; }
    .sidebar-footer { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.1); }
    .powered { font-size: 10px; opacity: 0.4; }
    .main-content { flex: 1; overflow-y: auto; background: #f0f4f8; }
  `]
})
export class AppComponent {}
