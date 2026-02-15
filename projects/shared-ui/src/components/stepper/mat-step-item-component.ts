import { Component, HostListener, inject, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { UI_STEPPER_PARENT } from './stepper-parent.token';

@Component({
  selector: 'dhce-mat-step-item',
  standalone: true,
  template: `
    <ng-template>
      <ng-content></ng-content>
    </ng-template>
  `,
})
export class MatStepItemComponent implements OnInit {
  @Input({ required: true }) label = '';

  @ViewChild(TemplateRef, { static: true }) contentTemplate!: TemplateRef<unknown>;

  private readonly stepperParent = inject(UI_STEPPER_PARENT, {
    optional: true,
    skipSelf: true,
  });

  private readonly invalidValidationSources = new Set<EventTarget>();

  get isValid(): boolean {
    return this.invalidValidationSources.size === 0;
  }

  ngOnInit(): void {
    if (!this.stepperParent) {
      throw new Error('dhce-mat-step-item must be used inside dhce-mat-stepper-component');
    }
  }

  @HostListener('dhceInputValidationChange', ['$event'])
  onInputValidationChange(event: Event): void {
    const customEvent = event as CustomEvent<{ valid?: boolean }>;
    const source = event.target;

    if (!source) {
      return;
    }

    if (customEvent.detail?.valid === false) {
      this.invalidValidationSources.add(source);
    } else {
      this.invalidValidationSources.delete(source);
    }
  }
}
