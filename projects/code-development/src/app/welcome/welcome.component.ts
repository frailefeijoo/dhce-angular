import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { MatCardComponent } from '../../../../shared-ui/src/components/card/mat-card-component';
import {
  MatStepperComponent,
  UiStepperSelectionChangeEvent,
} from '../../../../shared-ui/src/components/stepper/mat-stepper-component';
import { MatStepItemComponent } from '../../../../shared-ui/src/components/stepper/mat-step-item-component';
import {
  MatInputComponent,
  UiInputPickerTraceEvent,
  UiInputValidationTraceEvent,
} from '../../../../shared-ui/src/components/input/mat-input-component';
import {
  MatSelectComponent,
  UiSelectOption,
} from '../../../../shared-ui/src/components/select/mat-select-component';
import { DhceExtensionBridgeService } from '../../../../shared-extension-bridge/src/dhce-extension-bridge.service';
import { DhceLogsService } from '../../../../shared-logs/src';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [MatCardComponent, MatStepperComponent, MatStepItemComponent, MatInputComponent, MatSelectComponent],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.css',
})
export class WelcomeComponent implements OnInit, OnDestroy {
  @Input() accessCount = 1;
  @Output() completed = new EventEmitter<void>();
  @ViewChild(MatStepperComponent) private welcomeStepper?: MatStepperComponent;

  workspacePath = '';
  selectedTool = '';
  selectedToolLabel = '';
  private currentStepIndex = 0;
  workspacePathExists: boolean | null = false;
  workspacePathBusinessError = '';
  workspaceHasPanShell = false;
  workspaceHasBatShell = false;
  installedPdiVersion = '';
  private readonly requiredWorkspaceFiles = ['Pan.bat', 'Kitchen.bat'] as const;
  private readonly installationPathStorageKey = 'code-development:installation-path';
  readonly toolOptions: UiSelectOption[] = [
    {
      value: 'pdi-pentahoo-data-integration',
      label: 'PDI - Pentahoo Data Integration',
      icon: 'browser/spoon.ico',
    },
  ];
  readonly steps = [
    'Paso 1: Selecciona la herramienta',
    'Paso 2: Directorio de instalación',
    'Paso 3: Comienza a trabajar',
  ];

  private businessValidationRequestId = 0;
  private validationInFlight = false;
  private queuedValidationPath: string | null = null;
  private hasScheduledBridgeRetry = false;
  private bridgeRetryAttempts = 0;
  private readonly maxBridgeRetryAttempts = 1;
  private pendingRetryTimerId: ReturnType<typeof setTimeout> | null = null;

  readonly workspaceBridgePickerResolver = async (picker: 'file' | 'directory'): Promise<string | null> => {
    this.logs.info('welcome', 'workspacePickerResolverRequest', {
      method: 'fs.pickDirectory',
      picker,
      channel: this.extensionBridge.getChannel(),
      hasHost: this.extensionBridge.hasHost(),
    });

    if (picker !== 'directory') {
      return null;
    }

    const pickedPath = await this.extensionBridge.pickDirectory();
    if (pickedPath) {
      const normalizedPickedPath = this.normalizePath(pickedPath);

      if (normalizedPickedPath !== this.workspacePath) {
        this.workspacePath = normalizedPickedPath;
        this.clearInstallationDetails();
        this.clearPendingRetry();
        this.hasScheduledBridgeRetry = false;
        this.bridgeRetryAttempts = 0;

        this.logs.info('welcome', 'workspacePathSyncedFromBridgeResolver', {
          workspacePath: this.workspacePath,
          source: 'resolver',
          rawPath: pickedPath,
        });
      }

      void this.validateWorkspacePathExists(pickedPath, {
        source: 'picker-resolver',
        force: true,
      });

      this.logs.info('welcome', 'workspacePickerResolvedAbsolutePath', {
        rawPath: pickedPath,
        path: normalizedPickedPath,
      });
      return normalizedPickedPath;
    }

    this.logs.info('welcome', 'workspacePickerBridgeResponse', {
      method: 'fs.pickDirectory',
      channel: this.extensionBridge.getChannel(),
      hasHost: this.extensionBridge.hasHost(),
      selected: false,
    });
    this.logs.info('welcome', 'workspacePickerCancelledOrEmpty', {
      method: 'fs.pickDirectory',
    });
    return null;
  };

  get workspacePickerResolverOrUndefined():
    | ((picker: 'file' | 'directory') => Promise<string | null>)
    | undefined {
    if (!this.extensionBridge.hasHost()) {
      return undefined;
    }

    return this.workspaceBridgePickerResolver;
  }

  constructor(
    private readonly extensionBridge: DhceExtensionBridgeService,
    private readonly logs: DhceLogsService,
  ) {}

  ngOnInit(): void {
    this.logs.info('welcome', 'init', {
      workspacePath: this.workspacePath,
      steps: this.steps,
    });
    void this.validateWorkspacePathExists(this.workspacePath);
  }

  ngOnDestroy(): void {
    this.clearPendingRetry();
  }

  markAsCompleted(): void {
    if (this.workspacePathExists === true && this.workspacePath.trim()) {
      localStorage.setItem(this.installationPathStorageKey, this.workspacePath);
    }

    this.logs.info('welcome', 'onboardingCompleted', {
      finalWorkspacePath: this.workspacePath,
      workspacePathExists: this.workspacePathExists,
    });
    this.completed.emit();
  }

  onStepChange(event: UiStepperSelectionChangeEvent): void {
    this.currentStepIndex = event.selectedIndex;
    this.logs.info('welcome', 'stepChanged', {
      selectedIndex: event.selectedIndex,
      selectedLabel: this.steps[event.selectedIndex] ?? null,
      previousIndex: event.previouslySelectedIndex,
      previousLabel: this.steps[event.previouslySelectedIndex] ?? null,
      blocked: event.blocked,
    });
  }

  onWorkspacePickerTrace(event: UiInputPickerTraceEvent): void {
    this.logs.info('welcome', 'workspacePickerTrace', {
      phase: event.phase,
      mode: event.mode,
      source: event.source,
      value: event.value ?? null,
      filesCount: event.filesCount ?? null,
    });

    if (
      event.phase === 'selected' &&
      event.mode === 'directory' &&
      typeof event.value === 'string' &&
      event.value.trim() &&
      this.normalizePath(event.value) !== this.workspacePath
    ) {
      this.workspacePath = this.normalizePath(event.value);
      this.clearInstallationDetails();
      this.clearPendingRetry();
      this.hasScheduledBridgeRetry = false;
      this.bridgeRetryAttempts = 0;

      this.logs.info('welcome', 'workspacePathSyncedFromPickerTrace', {
        workspacePath: this.workspacePath,
        source: event.source,
      });

      void this.validateWorkspacePathExists(event.value, {
        source: `picker-trace:${event.source}`,
        force: true,
      });
    }
  }

  onWorkspaceUiValidationTrace(event: UiInputValidationTraceEvent): void {
    this.logs.info('welcome', 'workspaceUiValidationTrace', {
      phase: event.phase,
      valid: event.valid ?? null,
      errorMessage: event.errorMessage ?? null,
      value: `${event.value}`,
      type: event.type,
    });
  }

  onWorkspaceUiValidChange(valid: boolean): void {
    this.logs.info('welcome', 'workspaceUiValidChange', {
      valid,
      workspacePath: this.workspacePath,
      businessValid: this.workspacePathExists,
    });
  }

  onToolSelectionChange(value: string): void {
    this.selectedTool = value;
    this.selectedToolLabel = this.resolveToolLabel(value);
    this.logs.info('welcome', 'toolSelectionChanged', {
      selectedTool: this.selectedTool,
      selectedToolLabel: this.selectedToolLabel,
    });
  }

  onToolSelectionValidChange(valid: boolean): void {
    this.logs.info('welcome', 'toolSelectionValidChange', {
      valid,
      selectedTool: this.selectedTool,
    });

    if (valid && this.currentStepIndex === 0) {
      queueMicrotask(() => {
        if (this.currentStepIndex !== 0) {
          return;
        }

        const moved = this.welcomeStepper?.nextFromCurrent() ?? false;
        this.logs.info('welcome', 'toolSelectionAutoAdvanceAttempt', {
          moved,
          selectedTool: this.selectedTool,
          currentStepIndex: this.currentStepIndex,
        });
      });
    }
  }

  onWorkspacePathChange(value: string | number | boolean): void {
    const nextPath = this.normalizePath(`${value}`);
    const changed = nextPath !== this.workspacePath;

    if (!changed) {
      this.logs.info('welcome', 'workspacePathChangeIgnoredNoop', {
        workspacePath: this.workspacePath,
      });
      return;
    }

    this.workspacePath = nextPath;
    this.clearInstallationDetails();

    this.clearPendingRetry();
    this.hasScheduledBridgeRetry = false;
    this.bridgeRetryAttempts = 0;

    this.logs.info('welcome', 'workspacePathChanged', {
      workspacePath: this.workspacePath,
      changed,
    });
    void this.validateWorkspacePathExists(this.workspacePath, {
      source: 'workspace-path-change',
    });
  }

  canProceedFromStep(stepIndex: number): boolean {
    if (stepIndex === 0) {
      return Boolean(this.selectedTool.trim());
    }

    if (stepIndex === 1) {
      return Boolean(this.workspacePath.trim()) && this.workspacePathExists === true;
    }

    return true;
  }

  get summaryTool(): string {
    return this.selectedToolLabel || 'No seleccionada';
  }

  get summaryInstallationDirectory(): string {
    return this.workspacePath.trim() || 'No indicado';
  }

  get summaryShellPan(): string {
    if (!this.workspaceHasPanShell || !this.workspacePath.trim()) {
      return 'No disponible';
    }

    return `${this.workspacePath}/Pan.bat`;
  }

  get summaryShellBat(): string {
    if (!this.workspaceHasBatShell || !this.workspacePath.trim()) {
      return 'No disponible';
    }

    return `${this.workspacePath}/Kitchen.bat`;
  }

  get summaryPdiVersion(): string {
    return this.installedPdiVersion || 'No disponible';
  }

  private async validateWorkspacePathExists(
    path: string,
    options?: { source?: string; force?: boolean },
  ): Promise<void> {
    const normalizedPath = this.normalizePath(path);

    if (normalizedPath !== this.workspacePath) {
      this.workspacePath = normalizedPath;
    }

    if (this.validationInFlight) {
      this.queuedValidationPath = normalizedPath;
      this.logs.info('welcome', 'workspaceBusinessValidationQueued', {
        path: normalizedPath,
        source: options?.source ?? 'unknown',
        force: options?.force ?? false,
      });
      return;
    }

    this.validationInFlight = true;
    const requestId = ++this.businessValidationRequestId;
    this.logs.info('welcome', 'workspaceBusinessValidationStarted', {
      requestId,
      path: normalizedPath,
      source: options?.source ?? 'unknown',
      force: options?.force ?? false,
    });

    if (!normalizedPath.trim()) {
      this.workspacePathExists = false;
      this.workspacePathBusinessError = 'La ruta es obligatoria.';
      this.clearInstallationDetails();
      this.logs.warn('welcome', 'workspacePathEmpty');
      this.finishValidationCycle(requestId);
      return;
    }

    if (!this.extensionBridge.hasHost()) {
      this.workspacePathExists = null;
      this.workspacePathBusinessError = '';
      this.clearInstallationDetails();
      this.logs.warn('welcome', 'bridgeUnavailable', {
        requestId,
        hasScheduledBridgeRetry: this.hasScheduledBridgeRetry,
        bridgeRetryAttempts: this.bridgeRetryAttempts,
        maxBridgeRetryAttempts: this.maxBridgeRetryAttempts,
        path: normalizedPath,
      });

      if (!this.hasScheduledBridgeRetry && this.bridgeRetryAttempts < this.maxBridgeRetryAttempts) {
        this.retryBusinessValidation(normalizedPath, requestId);
      } else {
        this.logs.info('welcome', 'workspaceBusinessValidationRetrySkipped', {
          requestId,
          path: normalizedPath,
          reason: this.hasScheduledBridgeRetry
            ? 'retry-already-scheduled'
            : 'max-retries-reached',
        });
      }

      this.finishValidationCycle(requestId);
      return;
    }

    this.hasScheduledBridgeRetry = false;
    this.bridgeRetryAttempts = 0;
    this.clearPendingRetry();

    this.logs.info('welcome', 'workspaceBusinessValidationBridgeRequest', {
      requestId,
      method: 'fs.pathExists',
      channel: this.extensionBridge.getChannel(),
      hasHost: this.extensionBridge.hasHost(),
      path: normalizedPath,
    });

    try {
      const result = await this.extensionBridge.request<{ exists: boolean; error?: string }, { path: string }>(
        'fs.pathExists',
        { path: normalizedPath },
      );
      if (requestId !== this.businessValidationRequestId) {
        this.logs.info('welcome', 'workspaceBusinessValidationIgnoredOutdated', {
          requestId,
        });
        this.finishValidationCycle(requestId);
        return;
      }

      this.workspacePathExists = result.exists;
      this.workspacePathBusinessError = result.exists
        ? ''
        : result.error || 'La ruta indicada no existe en el sistema operativo cliente.';
      if (!result.exists) {
        this.clearInstallationDetails();
      }
      this.logs.info('welcome', 'workspaceBusinessValidationBridgeResponse', {
        requestId,
        method: 'fs.pathExists',
        channel: this.extensionBridge.getChannel(),
        ok: true,
        exists: result.exists,
        error: result.error ?? null,
      });
      this.logs.info('welcome', 'workspacePathValidated', {
        requestId,
        workspacePathExists: this.workspacePathExists,
        businessError: this.workspacePathBusinessError,
        path: normalizedPath,
      });

      if (result.exists) {
        const filesValidation = await this.validateWorkspaceRequiredFiles(normalizedPath, requestId);

        if (requestId !== this.businessValidationRequestId) {
          this.logs.info('welcome', 'workspaceRequiredFilesValidationIgnoredOutdated', {
            requestId,
          });
          this.finishValidationCycle(requestId);
          return;
        }

        if (!filesValidation.valid) {
          this.workspacePathExists = false;
          this.workspacePathBusinessError = filesValidation.errorMessage;
          this.workspaceHasPanShell = filesValidation.hasPanShell;
          this.workspaceHasBatShell = filesValidation.hasBatShell;
          this.installedPdiVersion = '';
        } else {
          this.workspaceHasPanShell = filesValidation.hasPanShell;
          this.workspaceHasBatShell = filesValidation.hasBatShell;
          this.installedPdiVersion = await this.resolveInstalledPdiVersion(normalizedPath, requestId);
        }
      }
    } catch (error) {
      if (requestId !== this.businessValidationRequestId) {
        this.logs.info('welcome', 'workspaceBusinessValidationErrorIgnoredOutdated', {
          requestId,
        });
        this.finishValidationCycle(requestId);
        return;
      }

      this.workspacePathExists = false;
      this.workspacePathBusinessError =
        'Error al validar la ruta en el sistema cliente.';
      this.clearInstallationDetails();
      this.logs.error('welcome', 'workspaceBusinessValidationBridgeResponse', {
        requestId,
        method: 'fs.pathExists',
        channel: this.extensionBridge.getChannel(),
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown bridge error',
      });
      this.logs.error('welcome', 'workspacePathValidationFailed', {
        requestId,
        path: normalizedPath,
      });
    } finally {
      this.finishValidationCycle(requestId);
    }
  }

  private async validateWorkspaceRequiredFiles(
    directoryPath: string,
    requestId: number,
  ): Promise<{ valid: boolean; errorMessage: string; hasPanShell: boolean; hasBatShell: boolean }> {
    const [firstFile, secondFile] = this.requiredWorkspaceFiles;

    this.logs.info('welcome', 'workspaceRequiredFilesValidationStarted', {
      requestId,
      directoryPath,
      files: this.requiredWorkspaceFiles,
    });

    const [firstResult, secondResult] = await Promise.all([
      this.extensionBridge.fileExistsInDirectory(directoryPath, firstFile),
      this.extensionBridge.fileExistsInDirectory(directoryPath, secondFile),
    ]);

    this.logs.info('welcome', 'workspaceRequiredFilesValidationBridgeResponse', {
      requestId,
      method: 'fs.fileExistsInDirectory',
      directoryPath,
      results: [
        { file: firstFile, exists: firstResult.exists, error: firstResult.error ?? null },
        { file: secondFile, exists: secondResult.exists, error: secondResult.error ?? null },
      ],
    });

    const missingFiles: string[] = [];
    if (!firstResult.exists) {
      missingFiles.push(firstFile);
    }
    if (!secondResult.exists) {
      missingFiles.push(secondFile);
    }

    if (missingFiles.length === 0) {
      return {
        valid: true,
        errorMessage: '',
        hasPanShell: firstResult.exists,
        hasBatShell: secondResult.exists,
      };
    }

    return {
      valid: false,
      errorMessage: 'El directorio no se corresponde con una instalación de Spoon valida',
      hasPanShell: firstResult.exists,
      hasBatShell: secondResult.exists,
    };
  }

  private async resolveInstalledPdiVersion(directoryPath: string, requestId: number): Promise<string> {
    const versionResult = await this.extensionBridge.getPdiInstalledVersion(directoryPath);

    if (requestId !== this.businessValidationRequestId) {
      return '';
    }

    this.logs.info('welcome', 'workspaceVersionValidationBridgeResponse', {
      directoryPath,
      version: versionResult.version ?? null,
      source: versionResult.source ?? null,
      error: versionResult.error ?? null,
    });

    return typeof versionResult.version === 'string' ? versionResult.version.trim() : '';
  }

  private retryBusinessValidation(path: string, requestId: number): void {
    this.hasScheduledBridgeRetry = true;
    this.bridgeRetryAttempts += 1;
    this.clearPendingRetry();

    this.logs.info('welcome', 'workspaceBusinessValidationRetryScheduled', {
      requestId,
      path,
      retryInMs: 400,
      bridgeRetryAttempts: this.bridgeRetryAttempts,
    });

    this.pendingRetryTimerId = setTimeout(() => {
      if (requestId !== this.businessValidationRequestId) {
        return;
      }

      this.logs.info('welcome', 'workspaceBusinessValidationRetryTriggered', {
        requestId,
        path,
        bridgeRetryAttempts: this.bridgeRetryAttempts,
      });

      this.hasScheduledBridgeRetry = false;
      this.pendingRetryTimerId = null;

      void this.validateWorkspacePathExists(path);
    }, 400);
  }

  private finishValidationCycle(requestId: number): void {
    if (requestId !== this.businessValidationRequestId) {
      return;
    }

    this.validationInFlight = false;

    const queuedPath = this.queuedValidationPath;
    this.queuedValidationPath = null;

    if (queuedPath) {
      this.logs.info('welcome', 'workspaceBusinessValidationQueueFlushed', {
        queuedPath,
      });
      void this.validateWorkspacePathExists(queuedPath, {
        source: 'queued-validation',
      });
    }
  }

  private normalizePath(rawPath: string): string {
    const trimmed = rawPath.trim();
    if (!trimmed) {
      return '';
    }

    let normalized = trimmed.replace(/\\/g, '/');

    if (/^[a-zA-Z]:$/.test(normalized)) {
      return `${normalized}/`;
    }

    if (normalized.startsWith('//')) {
      const body = normalized.slice(2).replace(/\/{2,}/g, '/');
      normalized = `//${body}`;
    } else {
      normalized = normalized.replace(/\/{2,}/g, '/');
    }

    if (!/^[a-zA-Z]:\/$/.test(normalized)) {
      normalized = normalized.replace(/\/+$/, '');
    }

    return normalized;
  }

  private clearPendingRetry(): void {
    if (this.pendingRetryTimerId !== null) {
      clearTimeout(this.pendingRetryTimerId);
      this.pendingRetryTimerId = null;
    }
  }

  private clearInstallationDetails(): void {
    this.workspaceHasPanShell = false;
    this.workspaceHasBatShell = false;
    this.installedPdiVersion = '';
  }

  private resolveToolLabel(toolValue: string): string {
    const selectedOption = this.toolOptions.find((option) => option.value === toolValue);
    return selectedOption?.label ?? '';
  }
}
