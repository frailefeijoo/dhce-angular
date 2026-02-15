import { Component, Input } from '@angular/core';
import { MatProgressSpinnerModule, ProgressSpinnerMode } from '@angular/material/progress-spinner';

@Component({
  selector: 'dhce-mat-progress-spinner-component',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <mat-progress-spinner
      [mode]="mode"
      [diameter]="diameter"
      [strokeWidth]="strokeWidth"
      [value]="value"
    ></mat-progress-spinner>
  `,
})
export class MatProgressSpinnerComponent {
  @Input() mode: ProgressSpinnerMode = 'indeterminate';
  @Input() diameter = 20;
  @Input() strokeWidth = 3;
  @Input() value = 0;
}

