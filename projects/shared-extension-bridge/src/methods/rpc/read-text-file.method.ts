import {
  FS_READ_TEXT_FILE_METHOD,
  FsReadTextFilePayload,
  FsReadTextFileResult,
} from '../../contracts';

export async function readTextFileMethod(
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
): Promise<FsReadTextFileResult> {
  if (typeof path !== 'string' || !path.trim()) {
    return {
      content: undefined,
      error: 'Path payload is invalid. Expected a non-empty string.',
    };
  }

  const normalizedPath = options.normalizeSystemPath(path);

  try {
    return await options.request<FsReadTextFileResult, FsReadTextFilePayload>(
      FS_READ_TEXT_FILE_METHOD,
      { path: normalizedPath },
      options.timeoutMs,
    );
  } catch (error) {
    return {
      content: undefined,
      error: error instanceof Error ? error.message : 'Unknown host bridge error.',
    };
  }
}
