import { InjectionToken } from '@angular/core';
import { DhceLogsConfig } from './dhce-logs.models';

export const DHCE_LOGS_CONFIG = new InjectionToken<DhceLogsConfig>('DHCE_LOGS_CONFIG');

export const DHCE_LOGS_DEFAULT_CONFIG: DhceLogsConfig = {
  enabled: true,
  console: true,
  minLevel: 'info',
  maxEntries: 200,
  projectId: 'default',
  persistToLocalStorage: true,
  storageKeyPrefix: 'dhce-logs',
  devFileSinkEnabled: false,
  devFileSinkUrl: 'http://127.0.0.1:4777/logs',
};
