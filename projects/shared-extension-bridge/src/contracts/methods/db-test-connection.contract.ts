export const DB_TEST_CONNECTION_METHOD = 'db.testConnection' as const;

export interface DbTestConnectionPayload {
  source: string; // e.g. 'jndi-properties' | 'tnsnames' | 'odbc-dsn'
  raw: string; // raw connection identifier or content
  filePath?: string; // optional original file path
}

export interface DbTestConnectionResult {
  ok: boolean;
  error?: string;
  details?: unknown;
}
