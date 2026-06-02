import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-impact-badge',
  template: `<span [class]="'badge badge-' + level">{{ level | uppercase }}</span>`,
  styles: [`
    .badge { padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }
    .badge-critical { background: #dc2626; color: white; }
    .badge-high     { background: #ea580c; color: white; }
    .badge-medium   { background: #d97706; color: white; }
    .badge-low      { background: #16a34a; color: white; }
    .badge-unknown  { background: #6b7280; color: white; }
  `]
})
export class ImpactBadgeComponent {
  @Input() level: string = 'unknown';
}
