import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'dhce-mat-card-component',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <mat-card>
      @if (title) {
        <mat-card-title>{{ title }}</mat-card-title>
      }
      @if (subtitle) {
        <mat-card-subtitle>{{ subtitle }}</mat-card-subtitle>
      }

      <ng-content></ng-content>
    </mat-card>
  `,
})
export class MatCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
}

