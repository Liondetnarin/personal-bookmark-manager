import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { migrateTestDatabase } from './migrate.mjs';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createApp } from '../dist/create-app.js';
import { DatabaseService } from '../dist/database/database.service.js';
import { readConfig } from '../dist/config.js';

test('production config rejects missing or insecure issuer', () => {
  assert.throws(() => readConfig({}), /AUTH0_ISSUER/);
  assert.throws(() => readConfig({ AUTH0_ISSUER: 'http://localhost:1234/' }), /HTTPS/);
});

test('startup errors do not echo invalid environment values', () => {
  const sensitiveValue = 'invalid-config-test-sentinel';
  const child = spawnSync(process.execPath, ['dist/main.js'], {
    env: { ...process.env, AUTH0_ISSUER: sensitiveValue }, encoding: 'utf8', windowsHide: true,
  });
  assert.equal(child.status, 1);
  assert.match(child.stderr, /Startup failed/);
  assert.ok(!(child.stdout + child.stderr).includes(sensitiveValue));
});

test('HTTP auth uses signed tokens, real JWKS and isolated SQL persistence', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'bookmark-auth-'));
  const databasePath = join(directory, 'test.db');
  migrateTestDatabase(databasePath);

  const signing = await generateKeyPair('RS256');
  const attacker = await generateKeyPair('RS256');
  const publicKey = { ...await exportJWK(signing.publicKey), kid: 'test-key', use: 'sig', alg: 'RS256' };
  let keyRequests = 0;
  const keyServer = createServer((request, response) => {
    if (request.url !== '/.well-known/jwks.json') { response.writeHead(404).end(); return; }
    keyRequests++;
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ keys: [publicKey] }));
  });
  keyServer.listen(0, '127.0.0.1');
  await once(keyServer, 'listening');
  // Tests construct config directly: no production environment switch to disable HTTPS or auth.
  const issuer = `http://127.0.0.1:${keyServer.address().port}/`;
  const config = { issuer, audience: 'https://bookmark-api.test', databaseUrl: `file:${databasePath}`, frontendOrigin: 'http://localhost:3000', port: 3001 };
  let app;
  let db;
  try {
    app = await createApp(config, false);
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    db = app.get(DatabaseService);
    const now = Math.floor(Date.now() / 1000);
    const token = (claims = {}, key = signing.privateKey, header = {}) => new SignJWT({
      iss: issuer, sub: 'auth0|user-a', aud: config.audience, iat: now, exp: now + 300, ...claims,
    }).setProtectedHeader({ alg: 'RS256', kid: 'test-key', ...header }).sign(key);
    const request = (authorization, suffix = '') => fetch(`${base}/me${suffix}`, {
      headers: authorization ? { Authorization: authorization } : {},
    });
    const deny = async (authorization) => {
      const before = await db.user.count();
      const response = await request(authorization);
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('www-authenticate'), 'Bearer');
      assert.deepEqual(await response.json(), { error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
      assert.equal(await db.user.count(), before, 'Rejected requests must not create users');
    };

    await t.test('rejects absent/malformed credentials and an unsigned token', async () => {
      await deny(undefined);
      await deny('Basic invalid');
      await deny('Bearer broken');
      await deny('Bearer one,two');
      const unsigned = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ iss: issuer, sub: 'a', aud: config.audience, exp: now + 300 })).toString('base64url')}.`;
      await deny(`Bearer ${unsigned}`);
    });
    const invalidClaims = [
      ['wrong issuer', { iss: 'https://other-tenant.test/' }],
      ['wrong audience / ID token', { aud: 'spa-client-id' }],
      ['expired', { exp: now - 60 }],
      ['not active yet', { nbf: now + 60 }],
      ['no expiry', { exp: undefined }],
      ['no subject', { sub: undefined }],
      ['empty subject', { sub: '' }],
      ['no issued-at', { iat: undefined }],
      ['future issued-at', { iat: now + 60 }],
      ['machine identity', { sub: 'machine@clients', gty: 'client-credentials' }],
    ];
    for (const [label, claims] of invalidClaims) {
      await t.test(`rejects ${label}`, async () => deny(`Bearer ${await token(claims)}`));
    }
    await t.test('rejects wrong signatures and HMAC algorithm confusion', async () => {
      await deny(`Bearer ${await token({}, attacker.privateKey)}`);
      const hmac = await new SignJWT({ iss: issuer, sub: 'a', aud: config.audience, exp: now + 300, iat: now })
        .setProtectedHeader({ alg: 'HS256', kid: 'test-key' }).sign(new TextEncoder().encode('test-only-key-never-used-in-app'));
      await deny(`Bearer ${hmac}`);
    });
    let owner;
    const userA = await token();
    await t.test('valid token creates a persistent user; repeat requests retain ID', async () => {
      const response = await request(`Bearer ${userA}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      owner = await response.json();
      assert.deepEqual(Object.keys(owner).sort(), ['id', 'subject']);
      assert.equal(owner.subject, 'auth0|user-a');
      assert.ok(owner.id);
      assert.deepEqual(await (await request(`Bearer ${userA}`)).json(), owner);
      assert.equal(await db.user.count(), 1);
    });
    await t.test('second user has a different ID; caller-supplied identity never changes /me', async () => {
      const userB = await token({ sub: 'auth0|user-b', aud: [config.audience, `${issuer}userinfo`] });
      const response = await request(`Bearer ${userB}`);
      assert.equal(response.status, 200);
      const other = await response.json();
      assert.notEqual(other.id, owner.id);
      assert.equal(other.subject, 'auth0|user-b');
      const attempted = await request(`Bearer ${userA}`, `?ownerId=${other.id}&subject=auth0%7Cuser-b`);
      assert.equal(attempted.status, 400);
      assert.deepEqual(await attempted.json(), { error: { code: 'VALIDATION_ERROR', message: 'Invalid request' } });
      assert.deepEqual(await (await request(`Bearer ${userA}`)).json(), owner);
      assert.equal(await db.user.count(), 2);
    });
    await t.test('concurrent first requests do not create duplicate identities', async () => {
      const fresh = await token({ sub: 'auth0|concurrent' });
      const responses = await Promise.all(Array.from({ length: 5 }, () => request(`Bearer ${fresh}`)));
      assert.ok(responses.every((r) => r.status === 200));
      const people = await Promise.all(responses.map((r) => r.json()));
      assert.equal(new Set(people.map((p) => p.id)).size, 1);
      assert.equal(await db.user.count(), 3);
    });
    await t.test('CORS preflight succeeds without allowing unauthenticated /me', async () => {
      const response = await fetch(`${base}/me`, { method: 'OPTIONS', headers: {
        Origin: config.frontendOrigin, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization',
      } });
      assert.equal(response.status, 204);
      assert.equal(response.headers.get('access-control-allow-origin'), config.frontendOrigin);
      await deny(undefined);
    });
    assert.ok(keyRequests > 0, 'The actual verifier must have fetched the local JWKS');
    await app.close();
    app = undefined;
    db = new DatabaseService(config.databaseUrl);
    assert.equal((await db.user.findUnique({ where: { issuer_subject: { issuer, subject: owner.subject } } })).id, owner.id);
    await db.$disconnect();
    db = undefined;
  } finally {
    if (app) await app.close();
    else if (db) await db.$disconnect();
    await new Promise((done) => keyServer.close(done));
    // Only remove the dedicated directory created by this test under the OS temp root.
    if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe test cleanup path');
    rmSync(directory, { recursive: true, force: true });
  }
});
