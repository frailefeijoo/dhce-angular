import {
  FsFileExistsInDirectoryResult,
} from './contracts/methods/fs-file-exists-in-directory.contract';
import { FsPathExistsResult } from './contracts/methods/fs-path-exists.contract';
import { FsPickDirectoryResult } from './contracts/methods/fs-pick-directory.contract';
import { FsReadTextFileResult } from './contracts/methods/fs-read-text-file.contract';
import { PdiGetInstalledVersionResult } from './contracts/methods/pdi-get-installed-version.contract';

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

export type DhcePathExistsResult = FsPathExistsResult;

export type DhcePickDirectoryResult = FsPickDirectoryResult;

export type DhceFileExistsInDirectoryResult = FsFileExistsInDirectoryResult;

export type DhceReadTextFileResult = FsReadTextFileResult;

export type DhcePdiInstalledVersionResult = PdiGetInstalledVersionResult;
