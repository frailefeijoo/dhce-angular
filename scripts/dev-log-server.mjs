import { createServer } from 'node:http';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = resolve(__dirname, '..');
const host = process.env.DHCE_LOG_HOST ?? '127.0.0.1';
const port = Number(process.env.DHCE_LOG_PORT ?? 4777);

const allowedProjects = new Set(['code-development', 'data-integration']);

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sanitizeProjectId(projectId) {
  if (typeof projectId !== 'string') {
    return null;
  }

  const trimmed = projectId.trim();
  if (!allowedProjects.has(trimmed)) {
    return null;
  }

  return trimmed;
}

function formatLogLine(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const timestamp = typeof entry.timestamp === 'string' ? entry.timestamp : new Date().toISOString();
  const level = typeof entry.level === 'string' ? entry.level.toUpperCase() : 'INFO';
  const scope = typeof entry.scope === 'string' ? entry.scope : 'unknown';
  const message = typeof entry.message === 'string' ? entry.message : '';
  const hasData = Object.prototype.hasOwnProperty.call(entry, 'data') && entry.data !== undefined;
  const dataText = hasData ? ` | data=${JSON.stringify(entry.data)}` : '';

  return `${timestamp} [${level}] [${scope}] ${message}${dataText}\n`;
}

async function writeEntry(projectId, entry) {
  const line = formatLogLine(entry);
  if (!line) {
    throw new Error('Invalid log entry payload');
  }

  const filePath = resolve(workspaceRoot, 'projects', projectId, 'logs', `${projectId}.log`);
  await mkdir(dirname(filePath), { recursive: true });
  await appendFile(filePath, line, 'utf8');
}

function readBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let data = '';

    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        rejectBody(new Error('Payload too large'));
      }
    });

    req.on('end', () => resolveBody(data));
    req.on('error', rejectBody);
  });
}

const server = createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method !== 'POST' || req.url !== '/logs') {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }

  try {
    const rawBody = await readBody(req);
    const payload = JSON.parse(rawBody);
    const projectId = sanitizeProjectId(payload?.projectId);

    if (!projectId) {
      res.statusCode = 400;
      res.end('Invalid projectId');
      return;
    }

    await writeEntry(projectId, payload?.entry);
    res.statusCode = 202;
    res.end('Accepted');
  } catch (error) {
    res.statusCode = 400;
    res.end(error instanceof Error ? error.message : 'Bad Request');
  }
});

server.listen(port, host, () => {
  process.stdout.write(`DHCE dev log server listening on http://${host}:${port}\n`);
});
