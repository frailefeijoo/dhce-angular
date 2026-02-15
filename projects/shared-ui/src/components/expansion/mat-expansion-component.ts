import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'dhce-mat-expansion-component',
  standalone: true,
  imports: [MatExpansionModule],
  template: `
    <mat-accordion class="dhce-mat-expansion-accordion">
      <mat-expansion-panel [expanded]="expanded" (opened)="onOpened()" (closed)="onClosed()">
        <mat-expansion-panel-header>
          <mat-panel-title>{{ title }}</mat-panel-title>
          @if (summary) {
            <mat-panel-description>{{ summary }}</mat-panel-description>
          }
          <div class="dhce-expansion-header-actions" (click)="$event.stopPropagation()">
            <ng-content select="[expansion-header-actions]"></ng-content>
          </div>
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

    .dhce-expansion-header-actions {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
    }
  `,
})
export class MatExpansionComponent {
  @Input() title = '';
  @Input() summary = '';
  @Input() expanded = false;
  @Output() expandedChange = new EventEmitter<boolean>();

  onOpened(): void {
    this.expanded = true;
    this.expandedChange.emit(true);
  }

  onClosed(): void {
    this.expanded = false;
    this.expandedChange.emit(false);
  }
}

