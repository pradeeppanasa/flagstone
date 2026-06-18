import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { MonitorComponent } from './features/monitor/monitor.component';
import { OnboardingComponent } from './features/onboarding/onboarding.component';
import { FxComponent } from './features/fx/fx.component';
import { RegulatoryComponent, ContractsComponent } from './features/regulatory/regulatory-contracts.component';
import { SettlementComponent } from './features/settlement/settlement.component';
import { SchemeComplianceComponent } from './features/scheme-compliance/scheme-compliance.component';
import { KycOnboardingComponent } from './features/kyc/kyc-onboarding.component';
import { ImpactBadgeComponent } from './shared/components/impact-badge/impact-badge.component';
import { AlertCardComponent } from './shared/components/alert-card/alert-card.component';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    MonitorComponent,
    OnboardingComponent,
    FxComponent,
    RegulatoryComponent,
    ContractsComponent,
    SettlementComponent,
    SchemeComplianceComponent,
    KycOnboardingComponent,
    ImpactBadgeComponent,
    AlertCardComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    CommonModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
