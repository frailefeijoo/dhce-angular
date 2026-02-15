import { DhceBridgeInboundMessage } from '../dhce-extension-bridge.models';

export type DhceBridgeEnvelope = {
  channel?: unknown;
  message?: unknown;
};

export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function isBridgeEnvelope(data: unknown): data is { channel: string; message: unknown } {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const envelope = data as DhceBridgeEnvelope;
  return typeof envelope.channel === 'string' && 'message' in envelope;
}

export function isBridgeInboundMessage(message: unknown): message is DhceBridgeInboundMessage {
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
