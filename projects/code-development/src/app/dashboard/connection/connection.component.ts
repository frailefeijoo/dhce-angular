import { Component, OnInit } from '@angular/core';
import { DhceExtensionBridgeService } from '../../../../../shared-extension-bridge/src/dhce-extension-bridge.service';
import { MatExpansionComponent } from '../../../../../shared-ui/src/components/expansion/mat-expansion-component';
import { MatInputComponent } from '../../../../../shared-ui/src/components/input/mat-input-component';
import { MatIconComponent } from '../../../../../shared-ui/src/components/icon/mat-icon-component';
import { MatProgressSpinnerComponent } from '../../../../../shared-ui/src/components/progress-spinner/mat-progress-spinner-component';

type ConnectionSourceConfig = {
  value: string;
  label: string;
  allowedExtensions: string[];
};

type StructuredConnection = {
  name: string;
  sourceType: string;
  raw: string;
};

@Component({
  selector: 'app-connection',
  standalone: true,
  imports: [
    MatExpansionComponent,
    MatInputComponent,
    MatIconComponent,
    MatProgressSpinnerComponent,
  ],
  templateUrl: './connection.component.html',
  styleUrl: './connection.component.css',
})
export class ConnectionComponent implements OnInit {
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
  private readonly installationPathStorageKey = 'code-development:installation-path';
  private readonly structuredConnectionsStorageKey = 'code-development:connections:structured';
  private readonly activeConnectionStorageKey = 'code-development:connections:active';

  connectionFilePath = '';
  connectionFileBusinessValid: boolean | null = null;
  connectionFileBusinessError = '';
  isValidatingConnectionFile = false;
  isPanelExpanded = true;
  structuredConnections: StructuredConnection[] = [];
  activeConnectionName = '';

  private businessValidationRequestId = 0;

  constructor(private readonly extensionBridge: DhceExtensionBridgeService) {}

  ngOnInit(): void {
    this.restoreSessionState();

    const installationPath = this.readInstallationPath();
    if (!installationPath) {
      return;
    }

    const normalizedInstallationPath = installationPath.replace(/\\/g, '/').replace(/\/+$/, '');
    const defaultConnectionPath = `${normalizedInstallationPath}/simple-jndi/jdbc.properties`;

    this.connectionFilePath = defaultConnectionPath;
    void this.validateConnectionFile(defaultConnectionPath);
  }

  get canSelectActiveConnection(): boolean {
    return this.structuredConnections.length > 0;
  }

  onPanelExpandedChange(expanded: boolean): void {
    this.isPanelExpanded = expanded;
  }

  onActiveConnectionChange(value: string): void {
    this.activeConnectionName = value ?? '';

    if (!this.activeConnectionName) {
      sessionStorage.removeItem(this.activeConnectionStorageKey);
      return;
    }

    sessionStorage.setItem(this.activeConnectionStorageKey, this.activeConnectionName);
  }

  get connectionFileHint(): string {
    const selectedSource = this.detectConnectionSource(this.connectionFilePath);
    if (!selectedSource) {
      const extensions = this.connectionSources.flatMap((source) => source.allowedExtensions);
      return `Extensiones permitidas: ${extensions.join(', ')}`;
    }

    return `Extensiones permitidas: ${selectedSource.allowedExtensions.join(', ')}`;
  }

  get detectedConnectionSourceLabel(): string {
    const selectedSource = this.detectConnectionSource(this.connectionFilePath);
    return selectedSource?.label ?? 'No reconocido';
  }

  get hasConnectionFileValue(): boolean {
    return this.connectionFilePath.trim().length > 0;
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

    const selectedSource = this.detectConnectionSource(path);
    if (!selectedSource) {
      this.connectionFileBusinessValid = false;
      this.connectionFileBusinessError =
        'El tipo de conexión no se reconoce por la extensión del fichero. Revisa la ruta y la extensión.';
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

    const fileContentResult = await this.extensionBridge.readTextFile(path);
    if (requestId !== this.businessValidationRequestId) {
      return;
    }

    if (!fileContentResult.content?.trim()) {
      this.connectionFileBusinessValid = false;
      this.connectionFileBusinessError =
        fileContentResult.error || 'No se pudo recuperar el contenido del fichero de conexiones.';
      return;
    }

    const connections = this.parseConnections(fileContentResult.content, selectedSource);
    if (connections.length === 0) {
      this.connectionFileBusinessValid = false;
      this.connectionFileBusinessError =
        'El fichero de conexiones no contiene conexiones válidas para el origen detectado.';
      return;
    }

    this.structuredConnections = connections;
    sessionStorage.setItem(this.structuredConnectionsStorageKey, JSON.stringify(this.structuredConnections));

    if (
      this.activeConnectionName &&
      !this.structuredConnections.some((connection) => connection.name === this.activeConnectionName)
    ) {
      this.activeConnectionName = '';
      sessionStorage.removeItem(this.activeConnectionStorageKey);
    }

    this.isPanelExpanded = false;

    this.connectionFileBusinessValid = true;
    this.connectionFileBusinessError = '';
  }

  private detectConnectionSource(path: string): ConnectionSourceConfig | null {
    const normalizedPath = `${path}`.trim().replace(/\\/g, '/').toLowerCase();
    if (!normalizedPath) {
      return null;
    }

    return this.connectionSources.find((source) =>
      source.allowedExtensions.some((extension) => normalizedPath.endsWith(extension.toLowerCase())),
    ) ?? null;
  }

  private readInstallationPath(): string {
    return localStorage.getItem(this.installationPathStorageKey)?.trim() ?? '';
  }

  private parseConnections(fileContent: string, source: ConnectionSourceConfig): StructuredConnection[] {
    if (source.value === 'jndi-properties') {
      return this.parseJndiPropertiesConnections(fileContent, source.label);
    }

    if (source.value === 'tnsnames') {
      return this.parseTnsNamesConnections(fileContent, source.label);
    }

    if (source.value === 'odbc-dsn') {
      return this.parseDsnConnections(fileContent, source.label);
    }

    return [];
  }

  private parseJndiPropertiesConnections(fileContent: string, sourceLabel: string): StructuredConnection[] {
    const names = new Set<string>();
    const lines = fileContent.split(/\r?\n/);

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('!')) {
        continue;
      }

      const slashIndex = trimmedLine.indexOf('/');
      const equalIndex = trimmedLine.indexOf('=');
      if (slashIndex <= 0 || equalIndex <= slashIndex) {
        continue;
      }

      names.add(trimmedLine.substring(0, slashIndex).trim());
    }

    return Array.from(names).map((name) => ({
      name,
      sourceType: sourceLabel,
      raw: name,
    }));
  }

  private parseTnsNamesConnections(fileContent: string, sourceLabel: string): StructuredConnection[] {
    const names = new Set<string>();
    const lines = fileContent.split(/\r?\n/);

    for (const line of lines) {
      const match = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=\s*\(/);
      if (!match) {
        continue;
      }

      names.add(match[1].trim());
    }

    return Array.from(names).map((name) => ({
      name,
      sourceType: sourceLabel,
      raw: name,
    }));
  }

  private parseDsnConnections(fileContent: string, sourceLabel: string): StructuredConnection[] {
    const names = new Set<string>();
    const sectionRegex = /^\s*\[([^\]]+)\]\s*$/gm;

    let match: RegExpExecArray | null;
    match = sectionRegex.exec(fileContent);
    while (match) {
      const sectionName = match[1].trim();
      if (sectionName && sectionName.toLowerCase() !== 'odbc') {
        names.add(sectionName);
      }

      match = sectionRegex.exec(fileContent);
    }

    return Array.from(names).map((name) => ({
      name,
      sourceType: sourceLabel,
      raw: name,
    }));
  }

  private restoreSessionState(): void {
    const storedConnections = sessionStorage.getItem(this.structuredConnectionsStorageKey);
    if (storedConnections) {
      try {
        const parsed = JSON.parse(storedConnections) as StructuredConnection[];
        this.structuredConnections = Array.isArray(parsed)
          ? parsed.filter((connection) => !!connection?.name && !!connection?.sourceType)
          : [];
      } catch {
        this.structuredConnections = [];
      }
    }

    const storedActiveConnection = sessionStorage.getItem(this.activeConnectionStorageKey)?.trim() ?? '';
    if (storedActiveConnection) {
      this.activeConnectionName = storedActiveConnection;
    }
  }
}
