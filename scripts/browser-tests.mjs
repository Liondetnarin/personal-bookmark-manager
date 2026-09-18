import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
// Keep browser binaries inside ignored node_modules, not a shared user directory.
const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/playwright/cli.js', import.meta.url)), ...process.argv.slice(2)], {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '0' }, stdio: 'inherit', windowsHide: true,
});
child.on('error', () => { process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
