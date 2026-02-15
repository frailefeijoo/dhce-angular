import {
  PDI_GET_INSTALLED_VERSION_METHOD,
  PdiGetInstalledVersionPayload,
  PdiGetInstalledVersionResult,
} from '../../contracts';

export async function getPdiInstalledVersionMethod(
  directoryPath: string,
  options: {
    timeoutMs: number;
    normalizeSystemPath: (value: string) => string;
    request: <TResponse = unknown, TPayload = unknown>(
      method: string,
      payload?: TPayload,
      timeoutMs?: number,
    ) => Promise<TResponse>;
  },
): Promise<PdiGetInstalledVersionResult> {
  if (typeof directoryPath !== 'string' || !directoryPath.trim()) {
    return {
      version: undefined,
      source: 'unknown',
      error: 'Directory path is invalid. Expected a non-empty string.',
    };
  }

  const normalizedDirectoryPath = options.normalizeSystemPath(directoryPath);

  try {
    return await options.request<PdiGetInstalledVersionResult, PdiGetInstalledVersionPayload>(
      PDI_GET_INSTALLED_VERSION_METHOD,
      {
        directoryPath: normalizedDirectoryPath,
      },
      options.timeoutMs,
    );
  } catch (error) {
    return {
      version: undefined,
      source: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown host bridge error.',
    };
  }
}
