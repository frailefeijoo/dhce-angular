import { Injectable, NgZone, inject } from '@angular/core';
import {
  extractInboundBridgeMessage,
  PendingBridgeRequest,
  resolveInboundBridgeResponse,
} from './core';
import {
  acquireVsCodeApi,
} from './utils';
import { createDhceBridgeServiceApi, DhceBridgeServiceApi } from './service-api';
import {
  DHCE_EXTENSION_BRIDGE_CONFIG,
  DHCE_EXTENSION_BRIDGE_DEFAULT_CONFIG,
} from './dhce-extension-bridge.tokens';
import { DhceLogsService } from '../../shared-logs/src';

@Injectable({ providedIn: 'root' })
export class DhceExtensionBridgeService {
  private readonly ngZone = inject(NgZone);
  private readonly config = inject(DHCE_EXTENSION_BRIDGE_CONFIG, {
    optional: true,
  }) ?? DHCE_EXTENSION_BRIDGE_DEFAULT_CONFIG;
  private readonly pickerTimeoutMs = Math.max(this.config.timeoutMs, 120_000);

  private readonly pendingRequests = new Map<string, PendingBridgeRequest>();
  private readonly vscodeApi = acquireVsCodeApi();
  private readonly logs = inject(DhceLogsService);
  private readonly serviceApi: DhceBridgeServiceApi;

  declare invoke: DhceBridgeServiceApi['invoke'];
  declare invokeTyped: DhceBridgeServiceApi['invokeTyped'];
  declare request: DhceBridgeServiceApi['request'];
  declare requestTyped: DhceBridgeServiceApi['requestTyped'];
  declare sendRequest: DhceBridgeServiceApi['sendRequest'];
  declare sendRequestTyped: DhceBridgeServiceApi['sendRequestTyped'];
  declare pathExists: DhceBridgeServiceApi['bridgeMethods']['pathExists'];
  declare readTextFile: DhceBridgeServiceApi['bridgeMethods']['readTextFile'];
  declare pickDirectory: DhceBridgeServiceApi['bridgeMethods']['pickDirectory'];
  declare fileExistsInDirectory: DhceBridgeServiceApi['bridgeMethods']['fileExistsInDirectory'];
  declare getPdiInstalledVersion: DhceBridgeServiceApi['bridgeMethods']['getPdiInstalledVersion'];
  declare testConnection: DhceBridgeServiceApi['bridgeMethods']['testConnection'];

  constructor() {
    this.serviceApi = createDhceBridgeServiceApi({
      config: this.config,
      pickerTimeoutMs: this.pickerTimeoutMs,
      vscodeApi: this.vscodeApi,
      pendingRequests: this.pendingRequests,
      debugLog: (event, payload) => this.debugLog(event, payload),
    });

    Object.assign(this, this.serviceApi, this.serviceApi.bridgeMethods);

    window.addEventListener('message', (event) => {
      this.ngZone.run(() => {
        this.handleInboundMessage(event.data);
      });
    });
  }

  hasHost(): boolean {
    return this.vscodeApi !== null;
  }

  getChannel(): string {
    return this.config.channel;
  }

  private handleInboundMessage(data: unknown): void {
    const inbound = extractInboundBridgeMessage({
      data,
      channel: this.config.channel,
      debugLog: (event, payload) => this.debugLog(event, payload),
    });

    if (!inbound) {
      return;
    }

    resolveInboundBridgeResponse({
      inbound,
      pendingRequests: this.pendingRequests,
      channel: this.config.channel,
      debugLog: (event, payload) => this.debugLog(event, payload),
    });
  }

  private debugLog(event: string, payload: Record<string, unknown>): void {
    this.logs.info('bridge', event, payload);

    if (!this.config.debug) {
      return;
    }

    console.debug('[DHCE Bridge]', event, payload);
  }
}
