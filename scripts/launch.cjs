const { spawnSync, spawn } = require('node:child_process');
const path = require('node:path');

process.chdir(path.resolve(__dirname, '..'));
const color = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const paint = (text, code) => color ? `\u001b[${code}m${text}\u001b[0m` : text;
console.log(paint('\n  ============================================', '33'));
console.log(paint('       WELCOME TO LESNOY / ДОБРО ПОЖАЛОВАТЬ!', '1;33'));
console.log(paint('       React + Express · Live request logger', '36'));
console.log(paint('  ============================================\n', '33'));

if (Number(process.versions.node.split('.')[0]) < 22) {
  console.error('Node.js 22 or newer is required.');
  process.exit(1);
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const manifest = require('../package.json');
const dependenciesInstalled = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).every(name => {
  try { require.resolve(name, { paths: [process.cwd()] }); return true; } catch (_) { return false; }
});
const commands = dependenciesInstalled ? [['run', 'build']] : [['ci', '--prefer-offline', '--no-audit', '--no-fund'], ['run', 'build']];
if (dependenciesInstalled) console.log(paint('  [1/2] Dependencies are installed.', '36'));
for (const args of commands) {
  console.log(paint(args[0] === 'ci' ? '  [1/2] Installing dependencies…' : '\n  [2/2] Building frontend…', '36'));
  const result = spawnSync(npm, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error || result.status !== 0) {
    console.error(paint(`\n  Startup failed: ${result.error ? result.error.message : `npm exited with ${result.status}`}`, '31'));
    process.exit(1);
  }
}

console.log(paint('\n  Starting frontend + backend. Requests will appear below.', '32'));
const server = spawn(process.execPath, ['server/index.cjs'], { stdio: 'inherit', env: process.env });
let stopping = false;
const stop = signal => {
  if (stopping) return;
  stopping = true;
  server.kill(signal);
  setTimeout(() => server.kill('SIGKILL'), 10000).unref();
};
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.on('exit', (code, signal) => { process.exitCode = stopping || signal === 'SIGINT' ? 0 : code === null ? 1 : code; });
