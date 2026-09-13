import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const children = [];

async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

function start(args, cwd, env = {}) {
  const child = spawn(process.execPath, args, {
    cwd, env: { ...process.env, ...env }, windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const record = { child, output: '', error: undefined };
  child.on('error', (error) => { record.error = error; });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => { record.output = (record.output + chunk).slice(-8000); });
  }
  children.push(record);
  return record;
}

async function ready(url, record, expectedStatus) {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (record.error) throw record.error;
    if (record.child.exitCode !== null) throw new Error(record.output);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.status === expectedStatus) return response;
    } catch { /* Startup may not have opened the socket yet. */ }
    await delay(250);
  }
  throw new Error(`Server did not become ready: ${url}\n${record.output}`);
}

try {
  const apiPort = await freePort();
  const apiUrl = `http://127.0.0.1:${apiPort}`;
  const api = start(['dist/main.js'], join(root, 'backend'), { PORT: String(apiPort) });
  await ready(apiUrl, api, 404);

  // Scaffolding deliberately exposes no business API before the auth lesson.
  for (const route of ['/me', '/collections', '/bookmarks']) {
    const response = await fetch(apiUrl + route);
    assert.equal(response.status, 404, `${route} must not exist yet`);
    assert.equal((await response.json()).statusCode, 404);
  }
  console.log('PASS: Nest starts; business routes are not exposed.');

  const webPort = await freePort();
  const webUrl = `http://127.0.0.1:${webPort}`;
  const vite = join(dirname(require.resolve('vite/package.json')), 'bin/vite.js');
  const web = start([vite, 'preview', '--port', String(webPort)], join(root, 'frontend'));
  const response = await ready(webUrl, web, 200);
  const html = await response.text();
  assert.match(html, /<title>Personal Bookmark Manager<\/title>/);
  assert.match(html, /id="root"/);
  const asset = html.match(/<script[^>]+src="([^"]+)"/);
  assert.ok(asset, 'Built HTML must load its JavaScript bundle');
  const bundle = await fetch(new URL(asset[1], webUrl));
  assert.equal(bundle.status, 200);
  assert.ok((await bundle.text()).length > 0);
  console.log('PASS: Vite preview serves built HTML and JavaScript.');
  console.log('Scope: startup/HTTP only. Auth, privacy, database and browser behavior are not tested here.');
} finally {
  await Promise.all(children.map(async ({ child }) => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const stopped = once(child, 'exit');
    child.kill();
    await stopped;
  }));
}
