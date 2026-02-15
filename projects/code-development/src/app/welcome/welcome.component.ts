import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
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
import { DhceExtensionBridgeService } from '../../../../shared-extension-bridge/src';
import { DhceLogsService } from '../../../../shared-logs/src';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [MatCardComponent, MatStepperComponent, MatStepItemComponent, MatInputComponent],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.css',
})
export class WelcomeComponent implements OnInit, OnDestroy {
  @Input() accessCount = 1;
  @Output() completed = new EventEmitter<void>();

  workspacePath = 'C:/dev/projects/angular/dhce-angular/projects/code-development';
  workspacePathExists: boolean | null = false;
  workspacePathBusinessError = '';
  readonly steps = [
    'Paso 1: Explora el código',
    'Paso 2: Personaliza tu experiencia',
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
      this.logs.info('welcome', 'workspacePickerResolvedAbsolutePath', {
        path: pickedPath,
      });
      return pickedPath;
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
    this.logs.info('welcome', 'onboardingCompleted', {
      finalWorkspacePath: this.workspacePath,
      workspacePathExists: this.workspacePathExists,
    });
    this.completed.emit();
  }

  onStepChange(event: UiStepperSelectionChangeEvent): void {
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
      this.clearPendingRetry();
      this.hasScheduledBridgeRetry = false;
      this.bridgeRetryAttempts = 0;

      this.logs.info('welcome', 'workspacePathSyncedFromPickerTrace', {
        workspacePath: this.workspacePath,
        source: event.source,
      });

      void this.validateWorkspacePathExists(this.workspacePath);
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

    this.clearPendingRetry();
    this.hasScheduledBridgeRetry = false;
    this.bridgeRetryAttempts = 0;

    this.logs.info('welcome', 'workspacePathChanged', {
      workspacePath: this.workspacePath,
      changed,
    });
    void this.validateWorkspacePathExists(this.workspacePath);
  }

  private async validateWorkspacePathExists(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);

    if (normalizedPath !== this.workspacePath) {
      this.workspacePath = normalizedPath;
    }

    if (this.validationInFlight) {
      this.queuedValidationPath = normalizedPath;
      this.logs.info('welcome', 'workspaceBusinessValidationQueued', {
        path: normalizedPath,
      });
      return;
    }

    this.validationInFlight = true;
    const requestId = ++this.businessValidationRequestId;
    this.logs.info('welcome', 'workspaceBusinessValidationStarted', {
      requestId,
      path: normalizedPath,
    });

    if (!normalizedPath.trim()) {
      this.workspacePathExists = false;
      this.workspacePathBusinessError = 'La ruta es obligatoria.';
      this.logs.warn('welcome', 'workspacePathEmpty');
      this.finishValidationCycle(requestId);
      return;
    }

    if (!this.extensionBridge.hasHost()) {
      this.workspacePathExists = null;
      this.workspacePathBusinessError = '';
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

    if (queuedPath && queuedPath !== this.workspacePath) {
      this.logs.info('welcome', 'workspaceBusinessValidationQueueDropped', {
        queuedPath,
        currentPath: this.workspacePath,
      });
      return;
    }

    if (queuedPath) {
      this.logs.info('welcome', 'workspaceBusinessValidationQueueFlushed', {
        queuedPath,
      });
      void this.validateWorkspacePathExists(queuedPath);
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
}
