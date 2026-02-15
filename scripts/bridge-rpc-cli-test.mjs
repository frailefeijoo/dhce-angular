import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { EventEmitter } from 'node:events';

const CHANNEL = 'dhce-extension-bridge';

class MockWindow extends EventEmitter {
  addEventListener(event, handler) {
    this.on(event, handler);
  }

  dispatchMessage(data) {
    this.emit('message', { data });
  }
}

class MockVsCodeApi {
  constructor(hostHandler) {
    this.hostHandler = hostHandler;
  }

  postMessage(envelope) {
    queueMicrotask(() => {
      this.hostHandler(envelope);
    });
  }
}

class BridgeClient {
  constructor({ win, vscode, channel }) {
    this.win = win;
    this.vscode = vscode;
    this.channel = channel;
    this.pending = new Map();

    this.win.addEventListener('message', (event) => {
      this.handleInbound(event.data);
    });
  }

  request(method, payload, timeoutMs = 10_000) {
    if (!method || typeof method !== 'string') {
      return Promise.reject(new Error('Bridge request requires a valid method name.'));
    }

    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      return Promise.reject(new Error('Bridge request timeout must be a positive number.'));
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const message = {
      kind: 'request',
      requestId,
      method,
      payload,
    };

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const pending = this.pending.get(requestId);
        if (!pending) {
          return;
        }

        this.pending.delete(requestId);
        pending.reject(new Error(`Host bridge timeout for method ${method}.`));
      }, timeoutMs);

      this.pending.set(requestId, {
        method,
        resolve,
        reject,
        timeoutId,
      });

      this.vscode.postMessage({
        channel: this.channel,
        message,
      });
    });
  }

  handleInbound(data) {
    if (!data || typeof data !== 'object') {
      return;
    }

    if (data.channel !== this.channel) {
      return;
    }

    const inbound = data.message;
    if (!inbound || inbound.kind !== 'response' || typeof inbound.requestId !== 'string') {
      return;
    }

    const pending = this.pending.get(inbound.requestId);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeoutId);
    this.pending.delete(inbound.requestId);

    if (inbound.ok) {
      pending.resolve(inbound.result);
      return;
    }

    pending.reject(new Error(inbound.error || 'Unknown host bridge error.'));
  }
}

async function pathExistsOnHost(path) {
  if (typeof path !== 'string' || !path.trim()) {
    throw new Error('Invalid payload for fs.pathExists: path must be a non-empty string.');
  }

  try {
    await access(path, constants.F_OK);
    return { exists: true };
  } catch {
    return { exists: false };
  }
}

function createHost({ win }) {
  return async (envelope) => {
    if (!envelope || envelope.channel !== CHANNEL) {
      return;
    }

    const request = envelope.message;
    if (!request || request.kind !== 'request' || typeof request.requestId !== 'string') {
      return;
    }

    if (request.method === 'debug.neverRespond') {
      return;
    }

    const response = {
      channel: CHANNEL,
      message: {
        kind: 'response',
        requestId: request.requestId,
        ok: true,
      },
    };

    try {
      switch (request.method) {
        case 'fs.pathExists': {
          response.message.result = await pathExistsOnHost(request.payload?.path);
          break;
        }
        case 'fs.pickDirectory': {
          response.message.result = {
            path: process.cwd(),
            cancelled: false,
          };
          break;
        }
        default: {
          response.message.ok = false;
          response.message.error = `Unknown bridge method: ${request.method}`;
          break;
        }
      }
    } catch (error) {
      response.message.ok = false;
      response.message.error = error instanceof Error ? error.message : 'Unknown host error.';
    }

    win.dispatchMessage(response);
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const win = new MockWindow();
  const host = createHost({ win });
  const vscode = new MockVsCodeApi(host);
  const bridge = new BridgeClient({ win, vscode, channel: CHANNEL });

  const existingPath = process.cwd();
  const nonExistingPath = `${process.cwd()}\\__dhce_not_exists_${Date.now()}`;

  const existing = await bridge.request('fs.pathExists', { path: existingPath });
  assert(existing.exists === true, 'Expected exists=true for existing path');
  console.log('PASS 1/6 existing path -> ok:true exists:true');

  const nonExisting = await bridge.request('fs.pathExists', { path: nonExistingPath });
  assert(nonExisting.exists === false, 'Expected exists=false for non-existing path');
  console.log('PASS 2/6 non-existing path -> ok:true exists:false');

  let invalidPayloadError = '';
  try {
    await bridge.request('fs.pathExists', {});
  } catch (error) {
    invalidPayloadError = error instanceof Error ? error.message : String(error);
  }
  assert(invalidPayloadError.includes('Invalid payload for fs.pathExists'), 'Expected invalid payload error');
  console.log('PASS 3/6 invalid payload -> ok:false with error');

  let unknownMethodError = '';
  try {
    await bridge.request('fs.unknownMethod', { foo: 1 });
  } catch (error) {
    unknownMethodError = error instanceof Error ? error.message : String(error);
  }
  assert(unknownMethodError.includes('Unknown bridge method'), 'Expected unknown method error');
  console.log('PASS 4/6 unknown method -> ok:false Unknown bridge method');

  let timeoutError = '';
  try {
    await bridge.request('debug.neverRespond', {}, 120);
  } catch (error) {
    timeoutError = error instanceof Error ? error.message : String(error);
  }
  assert(timeoutError.includes('timeout'), 'Expected timeout error');
  console.log('PASS 5/6 timeout controlled');

  const pickedDirectory = await bridge.request('fs.pickDirectory', {});
  assert(typeof pickedDirectory.path === 'string' && /^[a-zA-Z]:\\|^\//.test(pickedDirectory.path), 'Expected absolute path from fs.pickDirectory');
  console.log('PASS 6/7 fs.pickDirectory returns absolute path');

  const concurrentPaths = [
    process.cwd(),
    nonExistingPath,
    process.execPath,
    `${process.cwd()}\\_missing_A_${Date.now()}`,
    `${process.cwd()}\\_missing_B_${Date.now()}`,
    process.cwd(),
  ];

  const concurrentResults = await Promise.all(
    concurrentPaths.map((path) => bridge.request('fs.pathExists', { path })),
  );

  assert(concurrentResults.length === concurrentPaths.length, 'Expected all concurrent responses');
  assert(concurrentResults[0].exists === true, 'Expected first concurrent exists=true');
  assert(concurrentResults[1].exists === false, 'Expected second concurrent exists=false');
  console.log('PASS 7/7 concurrency 5+ requests correlated by requestId');

  console.log('\nAll bridge RPC CLI tests passed.');
}

run().catch((error) => {
  console.error('Bridge RPC CLI tests failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
