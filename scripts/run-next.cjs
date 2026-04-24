/**
 * Loads .env / .env.local (override) then runs Next with explicit -p so PORT from .env is always applied.
 */
const path = require('path');
const { spawn } = require('child_process');

const root = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env') });
require('dotenv').config({ path: path.join(root, '.env.local'), override: true });

const mode = process.argv[2] === 'start' ? 'start' : 'dev';
const port = process.env.PORT || '3000';
const nextCli = require.resolve('next/dist/bin/next');

const child = spawn(process.execPath, [nextCli, mode, '-p', port, ...process.argv.slice(3)], {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
