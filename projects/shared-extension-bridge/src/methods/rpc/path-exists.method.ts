import {
  FS_PATH_EXISTS_METHOD,
  FsPathExistsPayload,
  FsPathExistsResult,
} from '../../contracts';

export async function pathExistsMethod(
  path: string,
  options: {
    timeoutMs: number;
    normalizeSystemPath: (value: string) => string;
    request: <TResponse = unknown, TPayload = unknown>(
      method: string,
      payload?: TPayload,
      timeoutMs?: number,
    ) => Promise<TResponse>;
  },
): Promise<FsPathExistsResult> {
  if (typeof path !== 'string' || !path.trim()) {
    return {
      exists: false,
      error: 'Path payload is invalid. Expected a non-empty string.',
    };
  }

  const normalizedPath = options.normalizeSystemPath(path);

  try {
    return await options.request<FsPathExistsResult, FsPathExistsPayload>(
      FS_PATH_EXISTS_METHOD,
      { path: normalizedPath },
      options.timeoutMs,
    );
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown host bridge error.',
    };
  }
}
