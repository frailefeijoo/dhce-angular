import {
  DhceFileExistsInDirectoryResult,
  DhcePdiInstalledVersionResult,
  DhcePathExistsResult,
} from '../dhce-extension-bridge.models';

export interface DhceBridgeMethodsApi {
  pathExists(path: string): Promise<DhcePathExistsResult>;
  pickDirectory(): Promise<string | null>;
  fileExistsInDirectory(directoryPath: string, filePath: string): Promise<DhceFileExistsInDirectoryResult>;
  getPdiInstalledVersion(directoryPath: string): Promise<DhcePdiInstalledVersionResult>;
}
