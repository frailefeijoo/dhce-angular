import {
  DhceBridgeConfig,
  DhceFileExistsInDirectoryResult,
  DhcePdiInstalledVersionResult,
  DhcePathExistsResult,
  DhceReadTextFileResult,
} from '../dhce-extension-bridge.models';
import { DhceBridgeMethodsApi } from '../contracts/bridge-methods.contract';
import {
  DhceBridgeServiceMethodMap,
  DhceBridgeServiceMethodName,
} from '../contracts/service-rpc.contract';
import { PendingBridgeRequest, sendBridgeRequest } from '../core';
import { fileExistsInDirectoryMethod } from '../methods/rpc/file-exists-in-directory.method';
import { getPdiInstalledVersionMethod } from '../methods/rpc/get-pdi-installed-version.method';
import { pathExistsMethod } from '../methods/rpc/path-exists.method';
import { pickDirectoryMethod } from '../methods/rpc/pick-directory.method';
import { readTextFileMethod } from '../methods/rpc/read-text-file.method';
import { dbTestConnectionMethod } from '../methods/rpc/db-test-connection.method';
import { normalizeSystemPath, VsCodeApi } from '../utils';

export interface DhceBridgeServiceApi {
  invoke<TResponse = unknown, TPayload = unknown>(
    method: string,
    payload: TPayload,
  ): Promise<TResponse>;
  invokeTyped<TMethod extends DhceBridgeServiceMethodName>(
    method: TMethod,
    payload: DhceBridgeServiceMethodMap[TMethod]['payload'],
  ): Promise<DhceBridgeServiceMethodMap[TMethod]['result']>;
  request<TResponse = unknown, TPayload = unknown>(
    method: string,
    payload?: TPayload,
    timeoutMs?: number,
  ): Promise<TResponse>;
  requestTyped<TMethod extends DhceBridgeServiceMethodName>(
    method: TMethod,
    payload: DhceBridgeServiceMethodMap[TMethod]['payload'],
    timeoutMs?: number,
  ): Promise<DhceBridgeServiceMethodMap[TMethod]['result']>;
  sendRequest<TResponse = unknown, TPayload = unknown>(
    method: string,
    payload: TPayload,
  ): Promise<TResponse>;
  sendRequestTyped<TMethod extends DhceBridgeServiceMethodName>(
    method: TMethod,
    payload: DhceBridgeServiceMethodMap[TMethod]['payload'],
  ): Promise<DhceBridgeServiceMethodMap[TMethod]['result']>;
  bridgeMethods: DhceBridgeMethodsApi;
}

export function createDhceBridgeServiceApi(options: {
  config: DhceBridgeConfig;
  pickerTimeoutMs: number;
  vscodeApi: VsCodeApi | null;
  pendingRequests: Map<string, PendingBridgeRequest>;
  debugLog: (event: string, payload: Record<string, unknown>) => void;
}): DhceBridgeServiceApi {
  const request = <TResponse = unknown, TPayload = unknown>(
    method: string,
    payload?: TPayload,
    timeoutMs = 10_000,
  ): Promise<TResponse> => {
    return sendBridgeRequest<TResponse, TPayload>({
      method,
      payload,
      timeoutMs,
      channel: options.config.channel,
      vscodeApi: options.vscodeApi,
      pendingRequests: options.pendingRequests,
      debugLog: options.debugLog,
    });
  };

  const requestTyped = <TMethod extends DhceBridgeServiceMethodName>(
    method: TMethod,
    payload: DhceBridgeServiceMethodMap[TMethod]['payload'],
    timeoutMs = 10_000,
  ): Promise<DhceBridgeServiceMethodMap[TMethod]['result']> => {
    return request<DhceBridgeServiceMethodMap[TMethod]['result'], DhceBridgeServiceMethodMap[TMethod]['payload']>(
      method,
      payload,
      timeoutMs,
    );
  };

  const invoke = <TResponse = unknown, TPayload = unknown>(
    method: string,
    payload: TPayload,
  ): Promise<TResponse> => request<TResponse, TPayload>(method, payload, options.config.timeoutMs);

  const invokeTyped = <TMethod extends DhceBridgeServiceMethodName>(
    method: TMethod,
    payload: DhceBridgeServiceMethodMap[TMethod]['payload'],
  ): Promise<DhceBridgeServiceMethodMap[TMethod]['result']> => requestTyped(method, payload, options.config.timeoutMs);

  const sendRequest = <TResponse = unknown, TPayload = unknown>(
    method: string,
    payload: TPayload,
  ): Promise<TResponse> => request<TResponse, TPayload>(method, payload, options.config.timeoutMs);

  const sendRequestTyped = <TMethod extends DhceBridgeServiceMethodName>(
    method: TMethod,
    payload: DhceBridgeServiceMethodMap[TMethod]['payload'],
  ): Promise<DhceBridgeServiceMethodMap[TMethod]['result']> => requestTyped(method, payload, options.config.timeoutMs);

  const pathExists = (path: string): Promise<DhcePathExistsResult> => {
    return pathExistsMethod(path, {
      timeoutMs: options.config.timeoutMs,
      normalizeSystemPath: (value) => normalizeSystemPath(value),
      request,
    });
  };

  const pickDirectory = (): Promise<string | null> => {
    return pickDirectoryMethod({
      pickerTimeoutMs: options.pickerTimeoutMs,
      normalizeSystemPath: (value) => normalizeSystemPath(value),
      request,
      debugLog: options.debugLog,
    });
  };

  const readTextFile = (path: string): Promise<DhceReadTextFileResult> => {
    return readTextFileMethod(path, {
      timeoutMs: options.config.timeoutMs,
      normalizeSystemPath: (value) => normalizeSystemPath(value),
      request,
    });
  };

  const testConnection = (
    payload: { source: string; raw: string; filePath?: string },
  ): Promise<{ ok: boolean; error?: string; details?: unknown }> => {
    return dbTestConnectionMethod(payload, {
      timeoutMs: options.config.timeoutMs,
      request,
    });
  };

  const fileExistsInDirectory = (
    directoryPath: string,
    filePath: string,
  ): Promise<DhceFileExistsInDirectoryResult> => {
    return fileExistsInDirectoryMethod(directoryPath, filePath, {
      timeoutMs: options.config.timeoutMs,
      normalizeSystemPath: (value) => normalizeSystemPath(value),
      request,
    });
  };

  const getPdiInstalledVersion = (directoryPath: string): Promise<DhcePdiInstalledVersionResult> => {
    return getPdiInstalledVersionMethod(directoryPath, {
      timeoutMs: options.config.timeoutMs,
      normalizeSystemPath: (value) => normalizeSystemPath(value),
      request,
    });
  };

  const bridgeMethods: DhceBridgeMethodsApi = {
    pathExists,
    readTextFile,
    pickDirectory,
    fileExistsInDirectory,
    getPdiInstalledVersion,
    testConnection,
  };

  return {
    invoke,
    invokeTyped,
    request,
    requestTyped,
    sendRequest,
    sendRequestTyped,
    bridgeMethods,
  };
}
