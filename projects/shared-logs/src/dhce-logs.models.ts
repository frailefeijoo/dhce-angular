export type DhceLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface DhceLogEntry {
  timestamp: string;
  level: DhceLogLevel;
  scope: string;
  message: string;
  data?: unknown;
}

export interface DhceLogsConfig {
  enabled: boolean;
  console: boolean;
  minLevel: DhceLogLevel;
  maxEntries: number;
  projectId: string;
  persistToLocalStorage: boolean;
  storageKeyPrefix: string;
  devFileSinkEnabled: boolean;
  devFileSinkUrl: string;
}
