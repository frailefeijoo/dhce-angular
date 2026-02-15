import {
  DhceFileExistsInDirectoryResult,
  DhcePdiInstalledVersionResult,
  DhcePathExistsResult,
  DhceReadTextFileResult,
} from '../dhce-extension-bridge.models';

export interface DhceBridgeMethodsApi {
  pathExists(path: string): Promise<DhcePathExistsResult>;
  readTextFile(path: string): Promise<DhceReadTextFileResult>;
  pickDirectory(): Promise<string | null>;
  fileExistsInDirectory(directoryPath: string, filePath: string): Promise<DhceFileExistsInDirectoryResult>;
  getPdiInstalledVersion(directoryPath: string): Promise<DhcePdiInstalledVersionResult>;
}
