import {
  FS_FILE_EXISTS_IN_DIRECTORY_METHOD,
  FsFileExistsInDirectoryPayload,
  FsFileExistsInDirectoryResult,
} from './methods/fs-file-exists-in-directory.contract';
import {
  FS_PATH_EXISTS_METHOD,
  FsPathExistsPayload,
  FsPathExistsResult,
} from './methods/fs-path-exists.contract';
import {
  FS_READ_TEXT_FILE_METHOD,
  FsReadTextFilePayload,
  FsReadTextFileResult,
} from './methods/fs-read-text-file.contract';
import {
  FS_PICK_DIRECTORY_METHOD,
  FsPickDirectoryPayload,
  FsPickDirectoryResult,
} from './methods/fs-pick-directory.contract';
import {
  PDI_GET_INSTALLED_VERSION_METHOD,
  PdiGetInstalledVersionPayload,
  PdiGetInstalledVersionResult,
} from './methods/pdi-get-installed-version.contract';

export interface DhceBridgeServiceMethodMap {
  [FS_PATH_EXISTS_METHOD]: {
    payload: FsPathExistsPayload;
    result: FsPathExistsResult;
  };
  [FS_PICK_DIRECTORY_METHOD]: {
    payload: FsPickDirectoryPayload;
    result: FsPickDirectoryResult;
  };
  [FS_FILE_EXISTS_IN_DIRECTORY_METHOD]: {
    payload: FsFileExistsInDirectoryPayload;
    result: FsFileExistsInDirectoryResult;
  };
  [FS_READ_TEXT_FILE_METHOD]: {
    payload: FsReadTextFilePayload;
    result: FsReadTextFileResult;
  };
  [PDI_GET_INSTALLED_VERSION_METHOD]: {
    payload: PdiGetInstalledVersionPayload;
    result: PdiGetInstalledVersionResult;
  };
}

export type DhceBridgeServiceMethodName = keyof DhceBridgeServiceMethodMap;

export type DhceBridgeMethodMap = DhceBridgeServiceMethodMap;

export type DhceBridgeMethodName = DhceBridgeServiceMethodName;
