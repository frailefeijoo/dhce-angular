import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'dhce-mat-icon-component',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <mat-icon
      class="dhce-mat-icon"
      [style.fontSize.px]="size"
      [style.width.px]="size"
      [style.height.px]="size"
      [style.color]="color"
      [attr.aria-label]="ariaLabel || icon"
    >
      {{ icon }}
    </mat-icon>
  `,
  styles: `
    .dhce-mat-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
  `,
})
export class MatIconComponent {
  @Input() icon = 'info';
  @Input() size = 20;
  @Input() color = 'currentColor';
  @Input() ariaLabel = '';
}

