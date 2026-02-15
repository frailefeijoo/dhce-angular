import { spawn } from 'node:child_process';

const allowedApps = new Set(['code-development', 'data-integration']);
const app = process.argv[2] ?? 'code-development';

if (!allowedApps.has(app)) {
  process.stderr.write(
    `Invalid app "${app}". Use one of: ${Array.from(allowedApps).join(', ')}\n`,
  );
  process.exit(1);
}

const npmCmd = 'npm';
const useShell = process.platform === 'win32';
const children = [];
let shuttingDown = false;

function runProcess(name, args, colorCode) {
  const child = spawn(npmCmd, args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: useShell,
    env: process.env,
  });

  const prefix = `\u001b[${colorCode}m[${name}]\u001b[0m`;

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`${prefix} ${chunk.toString()}`);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(`${prefix} ${chunk.toString()}`);
  });

  child.on('exit', (code, signal) => {
    if (!shuttingDown && (code ?? 0) !== 0) {
      process.stderr.write(`${prefix} exited with code ${code ?? 'null'}${signal ? ` (signal ${signal})` : ''}\n`);
      shutdown(code ?? 1);
    }
  });

  children.push(child);
  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  }

  setTimeout(() => process.exit(exitCode), 200);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('uncaughtException', (error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  shutdown(1);
});

process.stdout.write(`Starting dev logs + ng serve for ${app}\n`);
runProcess('logs', ['run', 'start:dev-logs'], '36');

const serveArgs = ['run', `start:${app}`];
if (app === 'data-integration') {
  serveArgs.push('--', '--port', '4201');
}

runProcess('serve', serveArgs, '33');
