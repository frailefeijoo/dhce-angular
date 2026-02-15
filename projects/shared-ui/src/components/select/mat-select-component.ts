import { Component, ElementRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

export interface UiSelectOption {
  value: string;
  label: string;
  icon?: string;
}

@Component({
  selector: 'dhce-mat-select, dhce-mat-select-component',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule],
  template: `
    <mat-form-field
      appearance="outline"
      class="dhce-mat-select-field"
      [class.dhce-invalid]="!!errorMessage"
      [class.mat-form-field-invalid]="!!errorMessage"
      [class.mat-mdc-form-field-invalid]="!!errorMessage"
    >
      <mat-label>{{ label }}</mat-label>

      <mat-select
        [disabled]="readonly"
        [value]="selectedValue"
        (valueChange)="onValueChange($event)"
      >
        @for (option of normalizedOptions; track option.value) {
          <mat-option [value]="option.value">
            <span class="dhce-option-content">
              @if (option.icon) {
                <img [src]="option.icon" [alt]="option.label" class="dhce-option-icon" />
              }
              <span>{{ option.label }}</span>
            </span>
          </mat-option>
        }
      </mat-select>

      @if (hint) {
        <mat-hint>{{ hint }}</mat-hint>
      }

      @if (errorMessage) {
        <mat-error>{{ errorMessage }}</mat-error>
      }
    </mat-form-field>
  `,
  styles: `
    .dhce-mat-select-field {
      width: 100%;
      margin-top: 8px;
    }

    .dhce-option-content {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .dhce-option-icon {
      width: 16px;
      height: 16px;
      object-fit: contain;
    }

    :host ::ng-deep .dhce-mat-select-field.dhce-invalid .mdc-notched-outline__leading,
    :host ::ng-deep .dhce-mat-select-field.dhce-invalid .mdc-notched-outline__notch,
    :host ::ng-deep .dhce-mat-select-field.dhce-invalid .mdc-notched-outline__trailing {
      border-color: var(--mat-sys-error) !important;
      border-width: 2px !important;
    }

    :host ::ng-deep .dhce-mat-select-field.dhce-invalid .mdc-floating-label {
      color: var(--mat-sys-error) !important;
    }
  `,
})
export class MatSelectComponent {
  @Input() label = '';
  @Input() hint = '';
  @Input() readonly = false;
  @Input() required = false;
  @Input() validate = false;
  @Input() options: readonly UiSelectOption[] = [];
  @Input('default') defaultValue = '';

  @Output() valueChange = new EventEmitter<string>();
  @Output() validChange = new EventEmitter<boolean>();

  errorMessage = '';
  selectedValue = '';

  private readonly elementRef = inject(ElementRef<HTMLElement>);

  get normalizedOptions(): UiSelectOption[] {
    return this.options
      .filter((option) => !!option && typeof option.value === 'string' && typeof option.label === 'string')
      .map((option) => ({
        value: option.value,
        label: option.label,
        icon: option.icon,
      }));
  }

  ngOnInit(): void {
    this.selectedValue = this.defaultValue ?? '';
    this.validateAndEmit();
  }

  ngOnChanges(): void {
    this.selectedValue = this.defaultValue ?? this.selectedValue ?? '';
    this.validateAndEmit();
  }

  onValueChange(value: string): void {
    this.selectedValue = value ?? '';
    this.validateAndEmit();
  }

  private validateAndEmit(): void {
    const isKnownOption = this.normalizedOptions.some((option) => option.value === this.selectedValue);
    const valid = this.required ? !!this.selectedValue && isKnownOption : !this.selectedValue || isKnownOption;

    this.errorMessage = valid
      ? ''
      : this.required
        ? 'Debes seleccionar una opción.'
        : 'La opción seleccionada no es válida.';

    this.valueChange.emit(this.selectedValue);
    this.validChange.emit(valid);

    if (this.validate) {
      this.elementRef.nativeElement.dispatchEvent(
        new CustomEvent('dhceInputValidationChange', {
          bubbles: true,
          composed: true,
          detail: {
            valid,
            value: this.selectedValue,
            type: 'list',
          },
        }),
      );
    }
  }
}

