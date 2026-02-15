import { Component } from '@angular/core';
import { DhceExtensionBridgeService } from '../../../../../shared-extension-bridge/src/dhce-extension-bridge.service';
import { MatExpansionComponent } from '../../../../../shared-ui/src/components/expansion/mat-expansion-component';
import {
  MatSelectComponent,
  UiSelectOption,
} from '../../../../../shared-ui/src/components/select/mat-select-component';
import { MatInputComponent } from '../../../../../shared-ui/src/components/input/mat-input-component';
import { MatIconComponent } from '../../../../../shared-ui/src/components/icon/mat-icon-component';
import { MatProgressSpinnerComponent } from '../../../../../shared-ui/src/components/progress-spinner/mat-progress-spinner-component';

type ConnectionSourceConfig = {
  value: string;
  label: string;
  allowedExtensions: string[];
};

@Component({
  selector: 'app-connection',
  standalone: true,
  imports: [
    MatExpansionComponent,
    MatSelectComponent,
    MatInputComponent,
    MatIconComponent,
    MatProgressSpinnerComponent,
  ],
  templateUrl: './connection.component.html',
  styleUrl: './connection.component.css',
})
export class ConnectionComponent {
  private readonly connectionSources: ConnectionSourceConfig[] = [
    {
      value: 'jndi-properties',
      label: 'Fichero JNDI (.properties)',
      allowedExtensions: ['.properties'],
    },
    {
      value: 'tnsnames',
      label: 'Fichero tnsnames (.ora)',
      allowedExtensions: ['.ora'],
    },
    {
      value: 'odbc-dsn',
      label: 'Fichero ODBC DSN (.dsn)',
      allowedExtensions: ['.dsn'],
    },
  ];

  connectionSource = '';
  connectionSourceValid = false;

  connectionFilePath = '';
  connectionFileBusinessValid: boolean | null = null;
  connectionFileBusinessError = '';
  isValidatingConnectionFile = false;

  private businessValidationRequestId = 0;

  readonly connectionSourceOptions: UiSelectOption[] = this.connectionSources.map((source) => ({
    value: source.value,
    label: source.label,
  }));

  constructor(private readonly extensionBridge: DhceExtensionBridgeService) {}

  get connectionFileHint(): string {
    const selectedSource = this.connectionSources.find((source) => source.value === this.connectionSource);
    if (!selectedSource) {
      return 'Selecciona primero el origen de conexión para validar la extensión del fichero.';
    }

    return `Extensiones permitidas: ${selectedSource.allowedExtensions.join(', ')}`;
  }

  get hasConnectionFileValue(): boolean {
    return this.connectionFilePath.trim().length > 0;
  }

  onConnectionSourceChange(value: string): void {
    this.connectionSource = value ?? '';

    if (!this.connectionFilePath.trim()) {
      this.connectionFileBusinessValid = null;
      this.connectionFileBusinessError = '';
      return;
    }

    void this.validateConnectionFile(this.connectionFilePath);
  }

  onConnectionSourceValidChange(valid: boolean): void {
    this.connectionSourceValid = valid;
  }

  onConnectionFileChange(value: string | number | boolean): void {
    this.connectionFilePath = `${value}`;
    void this.validateConnectionFile(this.connectionFilePath);
  }

  private async validateConnectionFile(rawPath: string): Promise<void> {
    const path = rawPath.trim();
    const requestId = ++this.businessValidationRequestId;
    this.isValidatingConnectionFile = false;

    if (!path) {
      this.connectionFileBusinessValid = null;
      this.connectionFileBusinessError = '';
      return;
    }

    if (!this.connectionSourceValid) {
      this.connectionFileBusinessValid = false;
      this.connectionFileBusinessError = 'Debes seleccionar el origen de conexión antes de indicar el fichero.';
      return;
    }

    const selectedSource = this.connectionSources.find((source) => source.value === this.connectionSource);
    if (!selectedSource) {
      this.connectionFileBusinessValid = false;
      this.connectionFileBusinessError = 'Origen de conexión no reconocido.';
      return;
    }

    const normalizedPath = path.replace(/\\/g, '/');
    const hasAllowedExtension = selectedSource.allowedExtensions.some((extension) =>
      normalizedPath.toLowerCase().endsWith(extension.toLowerCase()),
    );

    if (!hasAllowedExtension) {
      this.connectionFileBusinessValid = false;
      this.connectionFileBusinessError =
        `El fichero debe tener una extensión válida para ${selectedSource.label}: ${selectedSource.allowedExtensions.join(', ')}.`;
      return;
    }

    if (!this.extensionBridge.hasHost()) {
      this.connectionFileBusinessValid = false;
      this.connectionFileBusinessError =
        'No es posible validar la ruta del fichero en el sistema cliente porque el bridge no está disponible.';
      return;
    }

    this.isValidatingConnectionFile = true;
    const fileExistsResult = await this.extensionBridge.pathExists(path);
    if (requestId !== this.businessValidationRequestId) {
      return;
    }

    this.isValidatingConnectionFile = false;

    if (!fileExistsResult.exists) {
      this.connectionFileBusinessValid = false;
      this.connectionFileBusinessError =
        fileExistsResult.error || 'La ruta del fichero indicada no existe en el sistema operativo cliente.';
      return;
    }

    this.connectionFileBusinessValid = true;
    this.connectionFileBusinessError = '';
  }
}
