export const PDI_GET_INSTALLED_VERSION_METHOD = 'pdi.getInstalledVersion' as const;

export interface PdiGetInstalledVersionPayload {
  directoryPath: string;
}

export interface PdiGetInstalledVersionResult {
  version?: string;
  source?: 'spoon' | 'pdi' | 'unknown';
  error?: string;
}
