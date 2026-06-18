import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { MonitorComponent } from './features/monitor/monitor.component';
import { OnboardingComponent } from './features/onboarding/onboarding.component';
import { FxComponent } from './features/fx/fx.component';
import { RegulatoryComponent, ContractsComponent } from './features/regulatory/regulatory-contracts.component';
import { SettlementComponent } from './features/settlement/settlement.component';
import { SchemeComplianceComponent } from './features/scheme-compliance/scheme-compliance.component';
import { KycOnboardingComponent } from './features/kyc/kyc-onboarding.component';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard',        component: DashboardComponent },
  { path: 'monitor',          component: MonitorComponent },
  { path: 'onboarding',       component: OnboardingComponent },
  { path: 'fx',               component: FxComponent },
  { path: 'regulatory',       component: RegulatoryComponent },
  { path: 'contracts',        component: ContractsComponent },
  { path: 'settlement',       component: SettlementComponent },
  { path: 'scheme-compliance', component: SchemeComplianceComponent },
  { path: 'kyc',              component: KycOnboardingComponent },
  { path: '**',               redirectTo: '/dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
