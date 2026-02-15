import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export type UiFileChooserMode = 'file' | 'directory';

export interface UiFileChooserTraceEvent {
  phase: 'open-requested' | 'open-started' | 'selected' | 'cancelled' | 'closed';
  mode: UiFileChooserMode;
  source: 'native-directory' | 'resolver' | 'hidden-input' | 'fallback';
  value?: string;
  filesCount?: number;
}

type DirectoryPickerHandle = {
  name: string;
};

@Component({
  selector: 'dhce-mat-file-chooser',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule],
  template: `
    <mat-form-field
      appearance="outline"
      class="dhce-mat-input-field"
      [class.dhce-invalid]="!!errorMessage"
      [class.mat-form-field-invalid]="!!errorMessage"
      [class.mat-mdc-form-field-invalid]="!!errorMessage"
    >
      <mat-label>{{ label }}</mat-label>
      <input
        matInput
        #visibleInput
        class="dhce-picker-visible-input"
        type="text"
        [placeholder]="placeholder"
        [readonly]="readonly"
        [value]="value"
        (focus)="onInputFocus()"
      />

      @if (hint) {
        <mat-hint>{{ hint }}</mat-hint>
      }

      @if (errorMessage) {
        <mat-error>{{ errorMessage }}</mat-error>
      }
    </mat-form-field>

    <input
      #hiddenPicker
      class="dhce-hidden-picker"
      type="file"
      [attr.webkitdirectory]="mode === 'directory' ? '' : null"
      [attr.directory]="mode === 'directory' ? '' : null"
      (change)="onPickerSelection($event)"
    />
  `,
  styles: `
    .dhce-mat-input-field {
      width: 100%;
      margin-top: 8px;
    }

    .dhce-hidden-picker {
      display: none;
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
export class MatFileChooserComponent {
  @Input() mode: UiFileChooserMode = 'file';
  @Input() label = '';
  @Input() placeholder = '';
  @Input() hint = '';
  @Input() value = '';
  @Input() readonly = true;
  @Input() errorMessage = '';
  @Input() pickerResolver?: (picker: UiFileChooserMode) => Promise<string | null | undefined>;

  @Output() valueChange = new EventEmitter<string>();
  @Output() pickerTrace = new EventEmitter<UiFileChooserTraceEvent>();

  @ViewChild('hiddenPicker', { static: true }) hiddenPicker!: ElementRef<HTMLInputElement>;
  @ViewChild('visibleInput', { static: true }) visibleInput!: ElementRef<HTMLInputElement>;

  private readonly elementRef = inject(ElementRef<HTMLElement>);

  private pickerDialogOpen = false;
  private ignoreFocusUntil = 0;

  onInputFocus(): void {
    if (this.pickerDialogOpen || Date.now() < this.ignoreFocusUntil) {
      return;
    }

    void this.openPicker();
  }

  private async openPicker(event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();

    this.pickerTrace.emit({
      phase: 'open-requested',
      mode: this.mode,
      source: 'hidden-input',
    });

    if (this.pickerResolver) {
      this.pickerTrace.emit({
        phase: 'open-started',
        mode: this.mode,
        source: 'resolver',
      });

      this.pickerDialogOpen = true;
      try {
        const selectedPath = await this.pickerResolver(this.mode);
        this.pickerDialogOpen = false;
        this.ignoreFocusUntil = Date.now() + 250;
        this.blurVisibleInput();

        if (typeof selectedPath === 'string' && selectedPath.trim()) {
          this.pickerTrace.emit({
            phase: 'selected',
            mode: this.mode,
            source: 'resolver',
            value: selectedPath,
          });
          this.valueChange.emit(selectedPath);
        } else {
          this.pickerTrace.emit({
            phase: 'cancelled',
            mode: this.mode,
            source: 'resolver',
          });
        }
      } finally {
        this.pickerDialogOpen = false;
        this.pickerTrace.emit({
          phase: 'closed',
          mode: this.mode,
          source: 'resolver',
        });
      }

      return;
    }

    if (this.mode === 'directory') {
      this.pickerTrace.emit({
        phase: 'open-started',
        mode: this.mode,
        source: 'native-directory',
      });

      this.pickerDialogOpen = true;
      try {
        const pickedDirectory = await this.openNativeDirectoryPicker();
        this.pickerDialogOpen = false;
        this.ignoreFocusUntil = Date.now() + 250;
        this.blurVisibleInput();

        if (pickedDirectory) {
          this.pickerTrace.emit({
            phase: 'selected',
            mode: this.mode,
            source: 'native-directory',
            value: pickedDirectory,
          });
          this.valueChange.emit(pickedDirectory);
        } else {
          this.pickerTrace.emit({
            phase: 'cancelled',
            mode: this.mode,
            source: 'native-directory',
          });
        }
      } finally {
        this.pickerDialogOpen = false;
        this.pickerTrace.emit({
          phase: 'closed',
          mode: this.mode,
          source: 'native-directory',
        });
      }

      return;
    }
    this.pickerTrace.emit({
      phase: 'open-started',
      mode: this.mode,
      source: 'hidden-input',
    });

    this.pickerDialogOpen = true;

    const onWindowFocus = () => {
      this.pickerDialogOpen = false;
      this.ignoreFocusUntil = Date.now() + 250;
      this.blurVisibleInput();
      this.pickerTrace.emit({
        phase: 'closed',
        mode: this.mode,
        source: 'hidden-input',
      });
    };

    window.addEventListener('focus', onWindowFocus, { once: true });
    this.hiddenPicker.nativeElement.click();
  }

  onPickerSelection(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    this.pickerDialogOpen = false;
    this.ignoreFocusUntil = Date.now() + 250;

    if (!files || files.length === 0) {
      this.pickerTrace.emit({
        phase: 'cancelled',
        mode: this.mode,
        source: 'hidden-input',
        filesCount: 0,
      });
      target.value = '';
      this.blurVisibleInput();
      return;
    }

    const selectedPath = this.resolveSelectedPath(files);
    if (!selectedPath) {
      this.pickerTrace.emit({
        phase: 'cancelled',
        mode: this.mode,
        source: 'hidden-input',
        filesCount: files.length,
      });
      target.value = '';
      this.blurVisibleInput();
      return;
    }

    this.pickerTrace.emit({
      phase: 'selected',
      mode: this.mode,
      source: 'hidden-input',
      value: selectedPath,
      filesCount: files.length,
    });

    target.value = '';
    this.blurVisibleInput();
    this.valueChange.emit(selectedPath);
  }

  private resolveSelectedPath(files: FileList): string {
    const firstFile = files.item(0) as (File & { path?: string; webkitRelativePath?: string }) | null;
    if (!firstFile) {
      return '';
    }

    if (typeof firstFile.path === 'string' && firstFile.path.trim()) {
      if (this.mode === 'directory') {
        const normalized = firstFile.path.replace(/\\/g, '/');
        const directoryPath = normalized.substring(0, normalized.lastIndexOf('/'));
        return directoryPath || firstFile.path;
      }

      return firstFile.path;
    }

    if (this.mode === 'directory' && firstFile.webkitRelativePath) {
      const firstFolder = firstFile.webkitRelativePath.split('/')[0];
      return firstFolder || firstFile.name;
    }

    return firstFile.name;
  }

  private async openNativeDirectoryPicker(): Promise<string | null> {
    const picker = (window as Window & {
      showDirectoryPicker?: () => Promise<DirectoryPickerHandle>;
    }).showDirectoryPicker;

    if (typeof picker === 'function') {
      try {
        const handle = await picker();
        return handle?.name ?? null;
      } catch {
        return null;
      }
    }

    return this.openDirectoryPickerFallback();
  }

  private openDirectoryPickerFallback(): Promise<string | null> {
    const pickerElement = this.elementRef.nativeElement.querySelector('.dhce-hidden-picker') as HTMLInputElement | null;
    if (!pickerElement) {
      return Promise.resolve(null);
    }

    return new Promise<string | null>((resolve) => {
      this.pickerTrace.emit({
        phase: 'open-started',
        mode: this.mode,
        source: 'fallback',
      });

      const onChange = (event: Event) => {
        pickerElement.removeEventListener('change', onChange);
        const target = event.target as HTMLInputElement;
        const files = target.files;

        if (!files || files.length === 0) {
          this.pickerTrace.emit({
            phase: 'cancelled',
            mode: this.mode,
            source: 'fallback',
            filesCount: 0,
          });
          this.pickerTrace.emit({
            phase: 'closed',
            mode: this.mode,
            source: 'fallback',
          });
          target.value = '';
          resolve(null);
          return;
        }

        const selectedPath = this.resolveSelectedPath(files);

        this.pickerTrace.emit({
          phase: 'selected',
          mode: this.mode,
          source: 'fallback',
          value: selectedPath,
          filesCount: files.length,
        });

        this.pickerTrace.emit({
          phase: 'closed',
          mode: this.mode,
          source: 'fallback',
        });

        target.value = '';
        resolve(selectedPath || null);
      };

      pickerElement.addEventListener('change', onChange, { once: true });
      pickerElement.click();
    });
  }

  private blurVisibleInput(): void {
    this.visibleInput.nativeElement.blur();
  }
}
