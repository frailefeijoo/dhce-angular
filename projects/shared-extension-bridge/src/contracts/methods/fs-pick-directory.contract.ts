export const FS_PICK_DIRECTORY_METHOD = 'fs.pickDirectory' as const;

export type FsPickDirectoryPayload = Record<string, never>;

export interface FsPickDirectoryResult {
  path?: string;
  cancelled?: boolean;
  error?: string;
}
