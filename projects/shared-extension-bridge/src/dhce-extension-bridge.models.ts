export interface DhceBridgeRequest<TPayload = unknown> {
  kind: 'request';
  requestId: string;
  method: string;
  payload: TPayload;
}

export interface DhceBridgeSuccessResponse<TResult = unknown> {
  kind: 'response';
  requestId: string;
  ok: true;
  result: TResult;
}

export interface DhceBridgeErrorResponse {
  kind: 'response';
  requestId: string;
  ok: false;
  error: string;
}

export type DhceBridgeResponse<TResult = unknown> =
  | DhceBridgeSuccessResponse<TResult>
  | DhceBridgeErrorResponse;

export interface DhceBridgeEvent<TPayload = unknown> {
  kind: 'event';
  event: string;
  payload: TPayload;
}

export type DhceBridgeInboundMessage<TResult = unknown> =
  | DhceBridgeResponse<TResult>
  | DhceBridgeEvent;

export interface DhceBridgeConfig {
  channel: string;
  timeoutMs: number;
  debug?: boolean;
}

export interface DhcePathExistsResult {
  exists: boolean;
  error?: string;
}

export interface DhcePickDirectoryResult {
  path?: string;
  cancelled?: boolean;
  error?: string;
}

export interface DhceFileExistsInDirectoryResult {
  exists: boolean;
  error?: string;
}
