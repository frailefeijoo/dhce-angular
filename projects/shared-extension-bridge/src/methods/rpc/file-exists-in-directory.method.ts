import {
  FS_FILE_EXISTS_IN_DIRECTORY_METHOD,
  FsFileExistsInDirectoryPayload,
  FsFileExistsInDirectoryResult,
} from '../../contracts';

export async function fileExistsInDirectoryMethod(
  directoryPath: string,
  filePath: string,
  options: {
    timeoutMs: number;
    normalizeSystemPath: (value: string) => string;
    request: <TResponse = unknown, TPayload = unknown>(
      method: string,
      payload?: TPayload,
      timeoutMs?: number,
    ) => Promise<TResponse>;
  },
): Promise<FsFileExistsInDirectoryResult> {
  if (typeof directoryPath !== 'string' || !directoryPath.trim()) {
    return {
      exists: false,
      error: 'Directory path is invalid. Expected a non-empty string.',
    };
  }

  if (typeof filePath !== 'string' || !filePath.trim()) {
    return {
      exists: false,
      error: 'File path is invalid. Expected a non-empty string.',
    };
  }

  const normalizedDirectoryPath = options.normalizeSystemPath(directoryPath);
  const normalizedFilePath = filePath.trim().replace(/\\/g, '/').replace(/^\/+/, '');

  try {
    return await options.request<FsFileExistsInDirectoryResult, FsFileExistsInDirectoryPayload>(
      FS_FILE_EXISTS_IN_DIRECTORY_METHOD,
      {
        directoryPath: normalizedDirectoryPath,
        filePath: normalizedFilePath,
      },
      options.timeoutMs,
    );
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown host bridge error.',
    };
  }
}
