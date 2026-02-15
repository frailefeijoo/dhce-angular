export const FS_READ_TEXT_FILE_METHOD = 'fs.readTextFile' as const;

export interface FsReadTextFilePayload {
  path: string;
}

export interface FsReadTextFileResult {
  content?: string;
  encoding?: string;
  error?: string;
}
