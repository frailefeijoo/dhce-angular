import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BehaviorSubject } from 'rxjs';
import {
  MatFileChooserComponent,
  UiFileChooserMode,
  UiFileChooserTraceEvent,
} from '../file-chooser/mat-file-chooser-component';

type UiInputType =
  | 'string'
  | 'string/email'
  | 'string/fullname'
  | 'string/path'
  | 'string/system-path'
  | 'file'
  | 'directory'
  | 'filechooser'
  | 'number'
  | 'boolean'
  | 'enum';

type UiPickerType = 'none' | 'file' | 'directory';

export interface UiInputValidationState {
  valid: boolean;
  value: string | number | boolean;
  errorMessage: string;
  type: UiInputType | string;
}

export interface UiInputPickerTraceEvent {
  phase: 'open-requested' | 'open-started' | 'selected' | 'cancelled' | 'closed';
  mode: UiFileChooserMode;
  source: 'native-directory' | 'resolver' | 'hidden-input' | 'fallback';
  value?: string;
  filesCount?: number;
}

export interface UiInputValidationTraceEvent {
  phase: 'start' | 'result';
  value: string | number | boolean;
  valid?: boolean;
  errorMessage?: string;
  type: UiInputType | string;
}

@Component({
  selector: 'dhce-mat-input, dhce-mat-input-component',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatFileChooserComponent],
  template: `
    @if (resolvedKind === 'boolean') {
      <div class="dhce-mat-input-boolean">
        <mat-checkbox
          [disabled]="readonly"
          [checked]="booleanValue"
          (change)="onBooleanChange($event.checked)"
        >
          {{ resolvedLabel }}
        </mat-checkbox>
        @if (resolvedHint) {
          <small class="dhce-mat-input-hint">{{ resolvedHint }}</small>
        }
      </div>
    } @else if (resolvedKind === 'enum') {
      <mat-form-field
        appearance="outline"
        class="dhce-mat-input-field"
        [class.dhce-invalid]="!!errorMessage"
        [class.mat-form-field-invalid]="!!errorMessage"
        [class.mat-mdc-form-field-invalid]="!!errorMessage"
      >
        <mat-label>{{ resolvedLabel }}</mat-label>
        <mat-select
          [disabled]="readonly"
          [value]="enumValue"
          (valueChange)="onEnumChange($event)"
        >
          @for (option of normalizedOptions; track option) {
            <mat-option [value]="option">{{ option }}</mat-option>
          }
        </mat-select>
        @if (resolvedHint) {
          <mat-hint>{{ resolvedHint }}</mat-hint>
        }
        @if (errorMessage) {
          <mat-error>{{ errorMessage }}</mat-error>
        }
      </mat-form-field>
    } @else {
      @if (usesPicker) {
        <dhce-mat-file-chooser
          [mode]="fileChooserMode"
          [label]="resolvedLabel"
          [placeholder]="resolvedPlaceholder"
          [hint]="resolvedHint"
          [value]="textValue"
          [readonly]="true"
          [errorMessage]="errorMessage"
          [pickerResolver]="pickerResolver"
          (valueChange)="onFileChooserValueChange($event)"
          (pickerTrace)="onFileChooserTrace($event)"
        ></dhce-mat-file-chooser>
      } @else {
        <mat-form-field
          appearance="outline"
          class="dhce-mat-input-field"
          [class.dhce-invalid]="!!errorMessage"
          [class.mat-form-field-invalid]="!!errorMessage"
          [class.mat-mdc-form-field-invalid]="!!errorMessage"
        >
          <mat-label>{{ resolvedLabel }}</mat-label>
          <input
            matInput
            [type]="resolvedInputType"
            [placeholder]="resolvedPlaceholder"
            [readonly]="readonly"
            [value]="textValue"
            (input)="onTextInput($event)"
          />
          @if (resolvedHint) {
            <mat-hint>{{ resolvedHint }}</mat-hint>
          }
          @if (errorMessage) {
            <mat-error>{{ errorMessage }}</mat-error>
          }
        </mat-form-field>
      }
    }
  `,
  styles: `
    .dhce-mat-input-field {
      width: 100%;
      margin-top: 8px;
    }

    .dhce-mat-input-boolean {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .dhce-mat-input-hint {
      color: rgba(0, 0, 0, 0.6);
      font-size: 12px;
    }

    :host ::ng-deep .dhce-mat-input-field.dhce-invalid .mdc-notched-outline__leading,
    :host ::ng-deep .dhce-mat-input-field.dhce-invalid .mdc-notched-outline__notch,
    :host ::ng-deep .dhce-mat-input-field.dhce-invalid .mdc-notched-outline__trailing {
      border-color: var(--mat-sys-error) !important;
      border-width: 2px !important;
    }

    :host ::ng-deep .dhce-mat-input-field.dhce-invalid .mdc-floating-label {
      color: var(--mat-sys-error) !important;
    }
  `,
})
export class MatInputComponent implements OnChanges {
  @Input() type: UiInputType | string = 'string';
  @Input() label = '';
  @Input() placeholder = '';
  @Input() hint = '';
  @Input() readonly = false;
  @Input() options: readonly string[] | string = [];
  @Input() required = false;
  @Input() validate = false;
  @Input() picker: UiPickerType = 'none';
  @Input() pickerLabel = 'Seleccionar';
  @Input() pickerResolver?: (picker: Exclude<UiPickerType, 'none'>) => Promise<string | null | undefined>;
  @Input() businessValid: boolean | null = null;
  @Input() businessError = 'Validación de negocio inválida.';
  @Input('default') defaultValue: string | number | boolean = '';

  @Output() valueChange = new EventEmitter<string | number | boolean>();
  @Output() validChange = new EventEmitter<boolean>();
  @Output() pickerTrace = new EventEmitter<UiInputPickerTraceEvent>();
  @Output() validationTrace = new EventEmitter<UiInputValidationTraceEvent>();

  textValue = '';
  enumValue = '';
  booleanValue = false;
  errorMessage = '';

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly valueSubject = new BehaviorSubject<string | number | boolean>('');
  private readonly validationStateSubject = new BehaviorSubject<UiInputValidationState>({
    valid: true,
    value: '',
    errorMessage: '',
    type: 'string',
  });

  readonly value$ = this.valueSubject.asObservable();
  readonly validationState$ = this.validationStateSubject.asObservable();

  get usesPicker(): boolean {
    return this.resolvedPickerMode !== 'none';
  }

  get fileChooserMode(): UiFileChooserMode {
    return this.resolvedPickerMode === 'directory' ? 'directory' : 'file';
  }

  get resolvedPickerMode(): UiFileChooserMode | 'none' {
    if (this.type === 'directory') {
      return 'directory';
    }

    if (this.type === 'file') {
      return 'file';
    }

    if (this.type === 'filechooser') {
      return this.picker === 'directory' ? 'directory' : 'file';
    }

    return this.picker;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['defaultValue'] || changes['type']) {
      this.initializeValue();
    }

    if (changes['options'] || changes['businessValid'] || changes['businessError']) {
      this.validateAndEmit();
    }
  }

  get resolvedKind(): UiInputType {
    switch (this.type) {
      case 'number':
      case 'boolean':
      case 'enum':
      case 'string/email':
      case 'string/fullname':
      case 'string/path':
      case 'string/system-path':
      case 'file':
      case 'directory':
      case 'filechooser':
      case 'string':
        return this.type;
      default:
        return 'string';
    }
  }

  get resolvedInputType(): string {
    if (this.resolvedKind === 'number') {
      return 'number';
    }

    if (this.resolvedKind === 'string/email') {
      return 'email';
    }

    return 'text';
  }

  get resolvedLabel(): string {
    if (this.label) {
      return this.label;
    }

    if (this.resolvedKind === 'string/system-path') {
      return 'Ruta del sistema';
    }

    if (this.resolvedKind === 'string/path') {
      return 'Ruta';
    }

    if (this.resolvedKind === 'directory') {
      return 'Directorio';
    }

    if (this.resolvedKind === 'filechooser') {
      return this.resolvedPickerMode === 'directory' ? 'Directorio' : 'Archivo';
    }

    if (this.resolvedKind === 'file') {
      return 'Archivo';
    }

    if (this.resolvedKind === 'string/email') {
      return 'Correo electrónico';
    }

    if (this.resolvedKind === 'string/fullname') {
      return 'Nombre completo';
    }

    if (this.resolvedKind === 'enum') {
      return 'Selecciona una opción';
    }

    return 'Valor';
  }

  get resolvedPlaceholder(): string {
    if (this.placeholder) {
      return this.placeholder;
    }

    if (this.resolvedKind === 'string/system-path') {
      return 'Ej: C:/dev/projects/angular/dhce-angular';
    }

    if (this.resolvedKind === 'string/path') {
      return 'Ej: projects/code-development';
    }

    if (this.resolvedKind === 'directory') {
      return 'Selecciona un directorio';
    }

    if (this.resolvedKind === 'file') {
      return 'Selecciona un archivo';
    }

    if (this.resolvedKind === 'filechooser') {
      return this.resolvedPickerMode === 'directory'
        ? 'Selecciona un directorio'
        : 'Selecciona un archivo';
    }

    return '';
  }

  get resolvedHint(): string {
    if (this.hint) {
      return this.hint;
    }

    switch (this.resolvedKind) {
      case 'string/system-path':
        return 'Debe ser una ruta absoluta válida del sistema.';
      case 'string/path':
        return 'Debe tener formato de ruta (relativa o absoluta).';
      case 'directory':
        return 'Selecciona un directorio.';
      case 'file':
        return 'Selecciona un archivo.';
      case 'filechooser':
        return this.resolvedPickerMode === 'directory'
          ? 'Selecciona un directorio.'
          : 'Selecciona un archivo.';
      case 'string/fullname':
        return 'Solo letras y espacios.';
      case 'enum':
        return 'Selecciona una opción de la lista.';
      default:
        return '';
    }
  }

  get normalizedOptions(): string[] {
    if (Array.isArray(this.options)) {
      return this.options.map((option) => `${option}`.trim()).filter(Boolean);
    }

    if (typeof this.options !== 'string') {
      return [];
    }

    return this.options
      .split(',')
      .map((option: string) => option.trim())
      .filter(Boolean);
  }

  onTextInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.textValue = target.value;
    this.validateAndEmit();
  }

  onFileChooserValueChange(value: string): void {
    this.textValue = value;
    this.validateAndEmit();
  }

  onFileChooserTrace(event: UiFileChooserTraceEvent): void {
    this.pickerTrace.emit(event);
  }

  onEnumChange(value: string): void {
    this.enumValue = value ?? '';
    this.validateAndEmit();
  }

  onBooleanChange(value: boolean): void {
    this.booleanValue = value;
    this.validateAndEmit();
  }

  private initializeValue(): void {
    const value = this.defaultValue ?? '';

    if (this.resolvedKind === 'boolean') {
      this.booleanValue = typeof value === 'boolean' ? value : `${value}`.toLowerCase() === 'true';
      this.validateAndEmit();
      return;
    }

    if (this.resolvedKind === 'enum') {
      this.enumValue = `${value}`;
      this.validateAndEmit();
      return;
    }

    this.textValue = `${value}`;
    this.validateAndEmit();
  }

  private validateAndEmit(): void {
    this.validationTrace.emit({
      phase: 'start',
      value: this.getCurrentValueSnapshot(),
      type: this.type,
    });

    let validation = this.validateValue();

    if (validation.valid && this.businessValid !== null && this.businessValid !== true) {
      validation = {
        valid: false,
        value: validation.value,
        errorMessage: this.businessError,
      };
    }

    this.errorMessage = validation.errorMessage;
    this.valueSubject.next(validation.value);

    const state: UiInputValidationState = {
      valid: validation.valid,
      value: validation.value,
      errorMessage: validation.errorMessage,
      type: this.type,
    };
    this.validationStateSubject.next(state);

    this.validationTrace.emit({
      phase: 'result',
      value: validation.value,
      valid: validation.valid,
      errorMessage: validation.errorMessage,
      type: this.type,
    });

    this.valueChange.emit(validation.value);

    this.validChange.emit(validation.valid);

    if (this.validate) {
      this.elementRef.nativeElement.dispatchEvent(
        new CustomEvent('dhceInputValidationChange', {
          bubbles: true,
          composed: true,
          detail: state,
        }),
      );
    }
  }

  private validateValue(): { valid: boolean; value: string | number | boolean; errorMessage: string } {
    if (this.resolvedKind === 'boolean') {
      return { valid: true, value: this.booleanValue, errorMessage: '' };
    }

    if (this.resolvedKind === 'enum') {
      if (this.normalizedOptions.length === 0) {
        return {
          valid: false,
          value: this.enumValue,
          errorMessage: 'El tipo enum requiere el atributo options.',
        };
      }

      if (this.required && !this.enumValue) {
        return {
          valid: false,
          value: this.enumValue,
          errorMessage: 'Este campo es obligatorio.',
        };
      }

      if (this.enumValue && !this.normalizedOptions.includes(this.enumValue)) {
        return {
          valid: false,
          value: this.enumValue,
          errorMessage: 'La opción seleccionada no es válida.',
        };
      }

      return { valid: true, value: this.enumValue, errorMessage: '' };
    }

    const rawValue = this.textValue.trim();

    if (this.required && !rawValue) {
      return {
        valid: false,
        value: this.textValue,
        errorMessage: 'Este campo es obligatorio.',
      };
    }

    if (!rawValue) {
      return { valid: true, value: this.textValue, errorMessage: '' };
    }

    if (this.resolvedKind === 'number') {
      const numberValue = Number(rawValue);
      if (!Number.isFinite(numberValue)) {
        return {
          valid: false,
          value: this.textValue,
          errorMessage: 'Debe ser un número válido.',
        };
      }

      return { valid: true, value: numberValue, errorMessage: '' };
    }

    if (this.resolvedKind === 'string/email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(rawValue)) {
        return {
          valid: false,
          value: this.textValue,
          errorMessage: 'Debe ser un correo electrónico válido.',
        };
      }
    }

    if (this.resolvedKind === 'string/fullname') {
      const fullnameRegex = /^[\p{L}]+(?: [\p{L}]+)*$/u;
      if (!fullnameRegex.test(rawValue)) {
        return {
          valid: false,
          value: this.textValue,
          errorMessage: 'Solo se permiten letras y espacios.',
        };
      }
    }

    if (this.resolvedKind === 'string/path') {
      if (!this.isPathFormat(rawValue)) {
        return {
          valid: false,
          value: this.textValue,
          errorMessage: 'Debe tener formato de ruta válido.',
        };
      }
    }

    if (this.resolvedKind === 'string/system-path') {
      if (!this.isPathFormat(rawValue) || !this.isSystemPath(rawValue)) {
        return {
          valid: false,
          value: this.textValue,
          errorMessage: 'Debe ser una ruta absoluta válida del sistema.',
        };
      }
    }

    return { valid: true, value: this.textValue, errorMessage: '' };
  }

  private isPathFormat(value: string): boolean {
    if (!value || /[<>"|?*]/.test(value)) {
      return false;
    }

    return /[\\/]/.test(value) || /^[a-zA-Z0-9._-]+$/.test(value);
  }

  private isSystemPath(value: string): boolean {
    const windowsAbsolute = /^[a-zA-Z]:[\\/]/;
    const unixAbsolute = /^\//;
    const uncPath = /^\\\\[^\\]+\\[^\\]+/;
    return windowsAbsolute.test(value) || unixAbsolute.test(value) || uncPath.test(value);
  }

  private getCurrentValueSnapshot(): string | number | boolean {
    if (this.resolvedKind === 'boolean') {
      return this.booleanValue;
    }

    if (this.resolvedKind === 'enum') {
      return this.enumValue;
    }

    return this.textValue;
  }
}

