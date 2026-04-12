import { spawn } from 'node:child_process';

const npmExecPath = process.env.npm_execpath;

if (!npmExecPath) {
  console.error('Unable to locate npm CLI path (npm_execpath is not set).');
  process.exit(1);
}

const children = new Map();
let shuttingDown = false;

function runScript(scriptName) {
  const child = spawn(process.execPath, [npmExecPath, 'run', scriptName], {
    stdio: 'inherit',
    env: process.env,
  });

  children.set(scriptName, child);

  child.on('exit', (code, signal) => {
    children.delete(scriptName);

    if (shuttingDown) {
      if (children.size === 0) {
        process.exit(code ?? 0);
      }
      return;
    }

    const failed = code !== 0;
    if (failed || signal) {
      shuttingDown = true;
      for (const other of children.values()) {
        other.kill('SIGTERM');
      }
      process.exit(code ?? 1);
    }

    if (children.size === 0) {
      process.exit(0);
    }
  });
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children.values()) {
    child.kill('SIGTERM');
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

runScript('dev');
runScript('electron');
