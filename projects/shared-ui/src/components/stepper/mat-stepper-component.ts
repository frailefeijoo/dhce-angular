import { Component, ContentChildren, EventEmitter, forwardRef, Input, Output, QueryList, ViewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatStepItemComponent } from './mat-step-item-component';
import { UI_STEPPER_PARENT } from './stepper-parent.token';

export interface UiStepperStep {
  label: string;
  description: string;
}

export interface UiStepperSelectionChangeEvent {
  selectedIndex: number;
  previouslySelectedIndex: number;
  blocked: boolean;
  hasProjectedSteps: boolean;
}

@Component({
  selector: 'dhce-mat-stepper-component',
  standalone: true,
  imports: [MatStepperModule, MatButtonModule, NgTemplateOutlet],
  providers: [
    {
      provide: UI_STEPPER_PARENT,
      useExisting: forwardRef(() => MatStepperComponent),
    },
  ],
  template: `
    <mat-stepper #materialStepper [linear]="linear" (selectionChange)="onSelectionChange(materialStepper, $event)">
      @if (hasProjectedSteps) {
        @for (step of projectedStepItems; track step.label + '-' + $index) {
          <mat-step [label]="step.label">
            <div (dhceInputValidationChange)="onProjectedStepValidationChange($index, $event)">
              <ng-container [ngTemplateOutlet]="step.contentTemplate"></ng-container>
            </div>

            @if ($index > 0) {
              <button mat-button matStepperPrevious>{{ previousLabel }}</button>
            }

            @if ($index < projectedStepItems.length - 1) {
              <button
                mat-button
                [disabled]="!canMoveFromProjectedStep($index)"
                (click)="goToNext(materialStepper, $index)"
              >
                {{ nextLabel }}
              </button>
            } @else {
              <button mat-flat-button color="primary" (click)="finish.emit()">
                {{ finishLabel }}
              </button>
            }
          </mat-step>
        }
      } @else {
        @for (step of steps; track step.label + '-' + $index) {
          <mat-step [label]="step.label">
            <p>{{ step.description }}</p>

            @if ($index > 0) {
              <button mat-button matStepperPrevious>{{ previousLabel }}</button>
            }

            @if ($index < steps.length - 1) {
              <button mat-button matStepperNext>{{ nextLabel }}</button>
            } @else {
              <button mat-flat-button color="primary" (click)="finish.emit()">
                {{ finishLabel }}
              </button>
            }
          </mat-step>
        }
      }
    </mat-stepper>
  `,
})
export class MatStepperComponent {
  @ContentChildren(MatStepItemComponent) projectedSteps!: QueryList<MatStepItemComponent>;
  @ViewChild(MatStepper) private materialStepper?: MatStepper;
  private readonly projectedStepInvalidSources = new Map<number, Set<EventTarget>>();

  @Input() steps: UiStepperStep[] = [
    {
      label: 'Bienvenida',
      description: 'Bienvenido al módulo Code Development.',
    },
    {
      label: 'Configuración',
      description: 'Configura tus preferencias iniciales.',
    },
    {
      label: 'Listo',
      description: 'Ya puedes empezar a trabajar con el dashboard.',
    },
  ];

  @Input() linear = false;
  @Input() nextLabel = 'Siguiente';
  @Input() previousLabel = 'Atrás';
  @Input() finishLabel = 'Finalizar configuración';

  @Output() finish = new EventEmitter<void>();
  @Output() stepChange = new EventEmitter<UiStepperSelectionChangeEvent>();

  get hasProjectedSteps(): boolean {
    return this.projectedStepItems.length > 0;
  }

  get projectedStepItems(): MatStepItemComponent[] {
    return this.projectedSteps ? this.projectedSteps.toArray() : [];
  }

  canMoveFromProjectedStep(stepIndex: number): boolean {
    const invalidSources = this.projectedStepInvalidSources.get(stepIndex);
    return !invalidSources || invalidSources.size === 0;
  }

  nextFromCurrent(): boolean {
    const stepper = this.materialStepper;
    if (!stepper) {
      return false;
    }

    const currentIndex = stepper.selectedIndex ?? 0;
    const lastIndex = this.hasProjectedSteps ? this.projectedStepItems.length - 1 : this.steps.length - 1;

    if (currentIndex >= lastIndex) {
      return false;
    }

    if (this.hasProjectedSteps && !this.canMoveFromProjectedStep(currentIndex)) {
      return false;
    }

    stepper.next();
    return true;
  }

  goToNext(stepper: MatStepper, stepIndex: number): void {
    if (!this.canMoveFromProjectedStep(stepIndex)) {
      return;
    }

    stepper.next();
  }

  onProjectedStepValidationChange(stepIndex: number, event: Event): void {
    const customEvent = event as CustomEvent<{ valid?: boolean }>;
    const source = event.target;

    if (!source) {
      return;
    }

    const stepInvalidSources = this.projectedStepInvalidSources.get(stepIndex) ?? new Set<EventTarget>();

    if (customEvent.detail?.valid === false) {
      stepInvalidSources.add(source);
    } else {
      stepInvalidSources.delete(source);
    }

    if (stepInvalidSources.size === 0) {
      this.projectedStepInvalidSources.delete(stepIndex);
      return;
    }

    this.projectedStepInvalidSources.set(stepIndex, stepInvalidSources);
  }

  onSelectionChange(stepper: MatStepper, event: StepperSelectionEvent): void {
    let blocked = false;

    if (!this.hasProjectedSteps) {
      this.stepChange.emit({
        selectedIndex: event.selectedIndex,
        previouslySelectedIndex: event.previouslySelectedIndex,
        blocked,
        hasProjectedSteps: this.hasProjectedSteps,
      });
      return;
    }

    if (event.selectedIndex <= event.previouslySelectedIndex) {
      return;
    }

    if (this.canMoveFromProjectedStep(event.previouslySelectedIndex)) {
      this.stepChange.emit({
        selectedIndex: event.selectedIndex,
        previouslySelectedIndex: event.previouslySelectedIndex,
        blocked,
        hasProjectedSteps: this.hasProjectedSteps,
      });
      return;
    }

    blocked = true;

    this.stepChange.emit({
      selectedIndex: event.selectedIndex,
      previouslySelectedIndex: event.previouslySelectedIndex,
      blocked,
      hasProjectedSteps: this.hasProjectedSteps,
    });

    queueMicrotask(() => {
      stepper.selectedIndex = event.previouslySelectedIndex;
    });
  }
}

