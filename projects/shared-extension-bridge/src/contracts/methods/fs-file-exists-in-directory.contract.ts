export const FS_FILE_EXISTS_IN_DIRECTORY_METHOD = 'fs.fileExistsInDirectory' as const;

export interface FsFileExistsInDirectoryPayload {
  directoryPath: string;
  filePath: string;
}

export interface FsFileExistsInDirectoryResult {
  exists: boolean;
  error?: string;
}
