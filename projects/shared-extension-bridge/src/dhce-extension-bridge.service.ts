import { Injectable, NgZone, inject } from '@angular/core';
import {
  DhceBridgeConfig,
  DhceBridgeInboundMessage,
  DhceFileExistsInDirectoryResult,
  DhcePdiInstalledVersionResult,
  DhcePickDirectoryResult,
  DhceBridgeRequest,
  DhcePathExistsResult,
} from './dhce-extension-bridge.models';
import {
  DHCE_EXTENSION_BRIDGE_CONFIG,
  DHCE_EXTENSION_BRIDGE_DEFAULT_CONFIG,
} from './dhce-extension-bridge.tokens';
import { DhceLogsService } from '../../shared-logs/src';

type VsCodeApi = {
  postMessage: (message: unknown) => void;
};

type PendingRequest = {
  method: string;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

type DhceBridgeEnvelope = {
  channel?: unknown;
  message?: unknown;
};

@Injectable({ providedIn: 'root' })
export class DhceExtensionBridgeService {
  private readonly ngZone = inject(NgZone);
  private readonly config = inject(DHCE_EXTENSION_BRIDGE_CONFIG, {
    optional: true,
  }) ?? DHCE_EXTENSION_BRIDGE_DEFAULT_CONFIG;
  private readonly pickerTimeoutMs = Math.max(this.config.timeoutMs, 120_000);

  private readonly pendingRequests = new Map<string, PendingRequest>();
  private readonly vscodeApi = this.acquireVsCodeApi();
  private readonly logs = inject(DhceLogsService);

  constructor() {
    window.addEventListener('message', (event) => {
      this.ngZone.run(() => {
        this.handleInboundMessage(event.data as DhceBridgeInboundMessage);
      });
    });
  }

  hasHost(): boolean {
    return this.vscodeApi !== null;
  }

  getChannel(): string {
    return this.config.channel;
  }

  async invoke<TResponse = unknown, TPayload = unknown>(
    method: string,
    payload: TPayload,
  ): Promise<TResponse> {
    return this.request<TResponse, TPayload>(method, payload, this.config.timeoutMs);
  }

  async request<TResponse = unknown, TPayload = unknown>(
    method: string,
    payload?: TPayload,
    timeoutMs = 10_000,
  ): Promise<TResponse> {
    if (!method || typeof method !== 'string') {
      throw new Error('Bridge request requires a valid method name.');
    }

    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new Error('Bridge request timeout must be a positive number.');
    }

    const vscodeApi = this.vscodeApi;
    if (!vscodeApi) {
      this.debugLog('request:host-unavailable', {
        method,
        channel: this.config.channel,
      });
      throw new Error('VSCode host bridge is not available in this runtime.');
    }

    const requestId = this.generateRequestId();
    const request: DhceBridgeRequest<TPayload> = {
      kind: 'request',
      requestId,
      method,
      payload: payload as TPayload,
    };

    this.debugLog('sendRequest', {
      method,
      requestId,
      channel: this.config.channel,
      hasHost: true,
    });

    return new Promise<TResponse>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const pending = this.pendingRequests.get(requestId);
        if (!pending) {
          return;
        }

        this.pendingRequests.delete(requestId);
        this.debugLog('timeout', {
          method,
          requestId,
          timeoutMs,
          channel: this.config.channel,
        });
        pending.reject(new Error(`Host bridge timeout for method ${method}.`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, {
        method,
        resolve: resolve as (value: unknown) => void,
        reject,
        timeoutId,
      });

      vscodeApi.postMessage({
        channel: this.config.channel,
        message: request,
      });
    });
  }

  async sendRequest<TResponse = unknown, TPayload = unknown>(
    method: string,
    payload: TPayload,
  ): Promise<TResponse> {
    return this.request<TResponse, TPayload>(method, payload, this.config.timeoutMs);
  }

  async pathExists(path: string): Promise<DhcePathExistsResult> {
    if (typeof path !== 'string' || !path.trim()) {
      return {
        exists: false,
        error: 'Path payload is invalid. Expected a non-empty string.',
      };
    }

    const normalizedPath = this.normalizeSystemPath(path);

    try {
      return await this.request<DhcePathExistsResult, { path: string }>(
        'fs.pathExists',
        { path: normalizedPath },
        this.config.timeoutMs,
      );
    } catch (error) {
      return {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown host bridge error.',
      };
    }
  }

  async pickDirectory(): Promise<string | null> {
    try {
      const result = await this.request<DhcePickDirectoryResult, Record<string, never>>(
        'fs.pickDirectory',
        {},
        this.pickerTimeoutMs,
      );

      if (result?.cancelled) {
        return null;
      }

      if (typeof result?.path === 'string' && result.path.trim()) {
        return this.normalizeSystemPath(result.path);
      }

      return null;
    } catch (error) {
      this.debugLog('pickDirectory:error', {
        timeoutMs: this.pickerTimeoutMs,
        error: error instanceof Error ? error.message : 'Unknown host bridge error.',
      });
      return null;
    }
  }

  async fileExistsInDirectory(
    directoryPath: string,
    filePath: string,
  ): Promise<DhceFileExistsInDirectoryResult> {
    if (typeof directoryPath !== 'string' || !directoryPath.trim()) {
      return {
        exists: false,
        error: 'Directory path is invalid. Expected a non-empty string.',
      };
    }

    if (typeof filePath !== 'string' || !filePath.trim()) {
      return {
        exists: false,
        error: 'File path is invalid. Expected a non-empty string.',
      };
    }

    const normalizedDirectoryPath = this.normalizeSystemPath(directoryPath);
    const normalizedFilePath = filePath.trim().replace(/\\/g, '/').replace(/^\/+/, '');

    try {
      return await this.request<DhceFileExistsInDirectoryResult, { directoryPath: string; filePath: string }>(
        'fs.fileExistsInDirectory',
        {
          directoryPath: normalizedDirectoryPath,
          filePath: normalizedFilePath,
        },
        this.config.timeoutMs,
      );
    } catch (error) {
      return {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown host bridge error.',
      };
    }
  }

  async getPdiInstalledVersion(directoryPath: string): Promise<DhcePdiInstalledVersionResult> {
    if (typeof directoryPath !== 'string' || !directoryPath.trim()) {
      return {
        version: undefined,
        source: 'unknown',
        error: 'Directory path is invalid. Expected a non-empty string.',
      };
    }

    const normalizedDirectoryPath = this.normalizeSystemPath(directoryPath);

    try {
      return await this.request<DhcePdiInstalledVersionResult, { directoryPath: string }>(
        'pdi.getInstalledVersion',
        {
          directoryPath: normalizedDirectoryPath,
        },
        this.config.timeoutMs,
      );
    } catch (error) {
      return {
        version: undefined,
        source: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown host bridge error.',
      };
    }
  }

  private handleInboundMessage(data: unknown): void {
    const inbound = this.extractInboundMessage(data);
    if (!inbound || inbound.kind !== 'response') {
      return;
    }

    const pending = this.pendingRequests.get(inbound.requestId);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeoutId);
    this.pendingRequests.delete(inbound.requestId);

    if (inbound.ok) {
      this.debugLog('response:ok', {
        requestId: inbound.requestId,
        method: pending.method,
        channel: this.config.channel,
      });
      pending.resolve(inbound.result);
      return;
    }

    this.debugLog('response:error', {
      requestId: inbound.requestId,
      method: pending.method,
      error: inbound.error,
      channel: this.config.channel,
    });
    pending.reject(new Error(inbound.error || 'Unknown host bridge error.'));
  }

  private extractInboundMessage(data: unknown): DhceBridgeInboundMessage | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    if (!this.isEnvelope(data)) {
      return null;
    }

    if (data.channel !== this.config.channel) {
      this.debugLog('discard:channel', {
        receivedChannel: data.channel,
        expectedChannel: this.config.channel,
      });
      return null;
    }

    if (!this.isInboundMessage(data.message)) {
      this.debugLog('discard:invalid-envelope', {
        reason: 'message shape mismatch',
      });
      return null;
    }

    return data.message;
  }

  private acquireVsCodeApi(): VsCodeApi | null {
    const apiFactory = (window as Window & { acquireVsCodeApi?: () => VsCodeApi }).acquireVsCodeApi;
    if (typeof apiFactory !== 'function') {
      return null;
    }

    try {
      return apiFactory();
    } catch {
      return null;
    }
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private normalizeSystemPath(rawPath: string): string {
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

  private isEnvelope(data: unknown): data is { channel: string; message: unknown } {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const envelope = data as DhceBridgeEnvelope;
    return typeof envelope.channel === 'string' && 'message' in envelope;
  }

  private isInboundMessage(message: unknown): message is DhceBridgeInboundMessage {
    if (!message || typeof message !== 'object') {
      return false;
    }

    const candidate = message as Partial<DhceBridgeInboundMessage>;
    if (candidate.kind !== 'response' && candidate.kind !== 'event') {
      return false;
    }

    if (candidate.kind === 'response') {
      return typeof candidate.requestId === 'string' && typeof candidate.ok === 'boolean';
    }

    return typeof (candidate as { event?: unknown }).event === 'string';
  }

  private debugLog(event: string, payload: Record<string, unknown>): void {
    this.logs.info('bridge', event, payload);

    if (!this.config.debug) {
      return;
    }

    console.debug('[DHCE Bridge]', event, payload);
  }
}
