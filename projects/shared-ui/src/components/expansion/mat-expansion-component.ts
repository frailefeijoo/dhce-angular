import { Component, Input } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'dhce-mat-expansion-component',
  standalone: true,
  imports: [MatExpansionModule],
  template: `
    <mat-accordion class="dhce-mat-expansion-accordion">
      <mat-expansion-panel [expanded]="expanded">
        <mat-expansion-panel-header>
          <mat-panel-title>{{ title }}</mat-panel-title>
          @if (summary) {
            <mat-panel-description>{{ summary }}</mat-panel-description>
          }
        </mat-expansion-panel-header>

        <ng-content></ng-content>
      </mat-expansion-panel>
    </mat-accordion>
  `,
  styles: `
    .dhce-mat-expansion-accordion {
      width: 100%;
      margin-top: 16px;
    }
  `,
})
export class MatExpansionComponent {
  @Input() title = '';
  @Input() summary = '';
  @Input() expanded = false;
}

