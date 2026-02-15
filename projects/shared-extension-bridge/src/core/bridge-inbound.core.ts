import { DhceBridgeInboundMessage } from '../dhce-extension-bridge.models';
import { isBridgeEnvelope, isBridgeInboundMessage } from '../utils';
import { PendingBridgeRequest } from './bridge-request.core';

export function extractInboundBridgeMessage(options: {
  data: unknown;
  channel: string;
  debugLog: (event: string, payload: Record<string, unknown>) => void;
}): DhceBridgeInboundMessage | null {
  const { data, channel, debugLog } = options;

  if (!data || typeof data !== 'object') {
    return null;
  }

  if (!isBridgeEnvelope(data)) {
    return null;
  }

  if (data.channel !== channel) {
    debugLog('discard:channel', {
      receivedChannel: data.channel,
      expectedChannel: channel,
    });
    return null;
  }

  if (!isBridgeInboundMessage(data.message)) {
    debugLog('discard:invalid-envelope', {
      reason: 'message shape mismatch',
    });
    return null;
  }

  return data.message;
}

export function resolveInboundBridgeResponse(options: {
  inbound: DhceBridgeInboundMessage;
  pendingRequests: Map<string, PendingBridgeRequest>;
  channel: string;
  debugLog: (event: string, payload: Record<string, unknown>) => void;
}): void {
  const { inbound, pendingRequests, channel, debugLog } = options;

  if (inbound.kind !== 'response') {
    return;
  }

  const pending = pendingRequests.get(inbound.requestId);
  if (!pending) {
    return;
  }

  clearTimeout(pending.timeoutId);
  pendingRequests.delete(inbound.requestId);

  if (inbound.ok) {
    debugLog('response:ok', {
      requestId: inbound.requestId,
      method: pending.method,
      channel,
    });
    pending.resolve(inbound.result);
    return;
  }

  debugLog('response:error', {
    requestId: inbound.requestId,
    method: pending.method,
    error: inbound.error,
    channel,
  });
  pending.reject(new Error(inbound.error || 'Unknown host bridge error.'));
}
