import { DhceBridgeRequest } from '../dhce-extension-bridge.models';
import { generateRequestId, VsCodeApi } from '../utils';

export type PendingBridgeRequest = {
  method: string;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

export async function sendBridgeRequest<TResponse = unknown, TPayload = unknown>(options: {
  method: string;
  payload?: TPayload;
  timeoutMs: number;
  channel: string;
  vscodeApi: VsCodeApi | null;
  pendingRequests: Map<string, PendingBridgeRequest>;
  debugLog: (event: string, payload: Record<string, unknown>) => void;
}): Promise<TResponse> {
  const { method, payload, timeoutMs, channel, vscodeApi, pendingRequests, debugLog } = options;

  if (!method || typeof method !== 'string') {
    throw new Error('Bridge request requires a valid method name.');
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Bridge request timeout must be a positive number.');
  }

  if (!vscodeApi) {
    debugLog('request:host-unavailable', {
      method,
      channel,
    });
    throw new Error('VSCode host bridge is not available in this runtime.');
  }

  const requestId = generateRequestId();
  const request: DhceBridgeRequest<TPayload> = {
    kind: 'request',
    requestId,
    method,
    payload: payload as TPayload,
  };

  debugLog('sendRequest', {
    method,
    requestId,
    channel,
    hasHost: true,
  });

  return new Promise<TResponse>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const pending = pendingRequests.get(requestId);
      if (!pending) {
        return;
      }

      pendingRequests.delete(requestId);
      debugLog('timeout', {
        method,
        requestId,
        timeoutMs,
        channel,
      });
      pending.reject(new Error(`Host bridge timeout for method ${method}.`));
    }, timeoutMs);

    pendingRequests.set(requestId, {
      method,
      resolve: resolve as (value: unknown) => void,
      reject,
      timeoutId,
    });

    vscodeApi.postMessage({
      channel,
      message: request,
    });
  });
}
