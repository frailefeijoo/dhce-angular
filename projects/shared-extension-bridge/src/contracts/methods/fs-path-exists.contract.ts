export const FS_PATH_EXISTS_METHOD = 'fs.pathExists' as const;

export interface FsPathExistsPayload {
  path: string;
}

export interface FsPathExistsResult {
  exists: boolean;
  error?: string;
}
