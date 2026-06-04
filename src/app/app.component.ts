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
      background: linear-gradient(180deg, #0f1f3d 0%, #1a3a5c 60%, #0f2744 100%);
      box-shadow: 2px 0 12px rgba(0,0,0,0.3);
    }
    .sidebar-header { padding: 22px 16px 18px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .logo-wrap { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .sidebar-logo { width: 48px; height: 48px; object-fit: contain; }
    .brand-name { display: block; font-weight: 700; font-size: 15px; letter-spacing: 0.3px; }
    .brand-sub { display: block; font-size: 10px; opacity: 0.5; margin-top: 2px; letter-spacing: 0.5px; text-transform: uppercase; }
    .nav-links { list-style: none; padding: 16px 0; margin: 0; flex: 1; }
    .nav-links li a { display: flex; align-items: center; gap: 10px; padding: 11px 18px; color: rgba(255,255,255,0.6); text-decoration: none; font-size: 13px; transition: all 0.2s; border-left: 3px solid transparent; }
    .nav-links li a:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.9); border-left-color: rgba(255,255,255,0.2); }
    .nav-links li a.active { background: rgba(255,255,255,0.1); color: white; border-left-color: #f97316; font-weight: 600; }
    .nav-icon { font-size: 15px; width: 20px; text-align: center; }
    .sidebar-footer { padding: 14px 18px; border-top: 1px solid rgba(255,255,255,0.08); }
    .powered { font-size: 10px; opacity: 0.3; letter-spacing: 0.5px; text-transform: uppercase; }

    /* Main content with AI-themed background */
    .main-content {
      flex: 1; overflow-y: auto;
      background-color: #eef2f7;
      background-image:
        radial-gradient(ellipse at 20% 20%, rgba(46, 117, 182, 0.08) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 80%, rgba(249, 115, 22, 0.06) 0%, transparent 60%),
        radial-gradient(ellipse at 60% 10%, rgba(99, 102, 241, 0.05) 0%, transparent 50%);
    }
  `]
})
export class AppComponent {}
