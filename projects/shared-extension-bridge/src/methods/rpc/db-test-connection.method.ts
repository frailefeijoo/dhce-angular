import { DB_TEST_CONNECTION_METHOD, DbTestConnectionPayload, DbTestConnectionResult } from '../../contracts';

export async function dbTestConnectionMethod(
  payload: DbTestConnectionPayload,
  options: {
    timeoutMs: number;
    request: <TResponse = unknown, TPayload = unknown>(
      method: string,
      payload?: TPayload,
      timeoutMs?: number,
    ) => Promise<TResponse>;
  },
): Promise<DbTestConnectionResult> {
  if (!payload || typeof payload !== 'object' || typeof payload.raw !== 'string') {
    return { ok: false, error: 'Invalid payload' };
  }

  try {
    const result = await options.request<DbTestConnectionResult, DbTestConnectionPayload>(
      DB_TEST_CONNECTION_METHOD,
      payload,
      options.timeoutMs,
    );

    return result;
  } catch (error: any) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown host bridge error' };
  }
}
