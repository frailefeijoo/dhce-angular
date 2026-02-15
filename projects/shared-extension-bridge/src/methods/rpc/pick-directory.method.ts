import {
  FS_PICK_DIRECTORY_METHOD,
  FsPickDirectoryPayload,
  FsPickDirectoryResult,
} from '../../contracts';

export async function pickDirectoryMethod(
  options: {
    pickerTimeoutMs: number;
    normalizeSystemPath: (value: string) => string;
    request: <TResponse = unknown, TPayload = unknown>(
      method: string,
      payload?: TPayload,
      timeoutMs?: number,
    ) => Promise<TResponse>;
    debugLog: (event: string, payload: Record<string, unknown>) => void;
  },
): Promise<string | null> {
  try {
    const result = await options.request<FsPickDirectoryResult, FsPickDirectoryPayload>(
      FS_PICK_DIRECTORY_METHOD,
      {},
      options.pickerTimeoutMs,
    );

    if (result?.cancelled) {
      return null;
    }

    if (typeof result?.path === 'string' && result.path.trim()) {
      return options.normalizeSystemPath(result.path);
    }

    return null;
  } catch (error) {
    options.debugLog('pickDirectory:error', {
      timeoutMs: options.pickerTimeoutMs,
      error: error instanceof Error ? error.message : 'Unknown host bridge error.',
    });
    return null;
  }
}
