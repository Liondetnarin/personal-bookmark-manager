import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createApp } from '../dist/create-app.js';
import { DatabaseService } from '../dist/database/database.service.js';
import { migrateTestDatabase } from './migrate.mjs';

test('Collections HTTP contract and ownership with signed tokens and isolated SQLite', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'bookmark-collections-'));
  const path = join(directory, 'test.db');
  migrateTestDatabase(path);
  const keys = await generateKeyPair('RS256');
  const publicKey = { ...await exportJWK(keys.publicKey), kid: 'collections-key', alg: 'RS256', use: 'sig' };
  const jwks = createServer((req, res) => {
    if (req.url !== '/.well-known/jwks.json') { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ keys: [publicKey] }));
  });
  jwks.listen(0, '127.0.0.1');
  await once(jwks, 'listening');
  const issuer = `http://127.0.0.1:${jwks.address().port}/`;
  const audience = 'https://collections-api.test';
  let app;
  try {
    app = await createApp({ issuer, audience, databaseUrl: `file:${path}`, frontendOrigin: 'http://localhost:3000', port: 3001 }, false);
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const db = app.get(DatabaseService);
    const sign = (sub) => new SignJWT({ sub }).setProtectedHeader({ alg: 'RS256', kid: 'collections-key' })
      .setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime('5m').sign(keys.privateKey);
    const a = await sign('auth0|collections-a');
    const b = await sign('auth0|collections-b');
    const request = async (token, method, route = '/collections', body) => {
      const response = await fetch(base + route, { method, headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : null, headers: response.headers };
    };
    const create = async (token, name) => {
      const response = await request(token, 'POST', '/collections', { name });
      assert.equal(response.status, 201);
      return response.body;
    };
    const route = (item) => `/collections/${item.id}`;
    let first;
    let other;

    await t.test('every collection operation rejects missing and invalid credentials before mutation', async () => {
      for (const [method, url] of [['GET', '/collections'], ['POST', '/collections'], ['GET', '/collections/no-id'], ['PUT', '/collections/no-id'], ['PATCH', '/collections/no-id'], ['DELETE', '/collections/no-id']]) {
        for (const token of [undefined, 'invalid']) {
          const result = await request(token, method, url, ['POST', 'PUT', 'PATCH'].includes(method) ? { name: 'Denied' } : undefined);
          assert.equal(result.status, 401);
        }
      }
      assert.equal(await db.user.count(), 0);
      assert.equal(await db.collection.count(), 0);
    });

    await t.test('create resolves owner without calling /me and returns only the contract fields', async () => {
      first = await create(a, '  Reading  ');
      assert.equal(first.name, 'Reading');
      assert.deepEqual(Object.keys(first).sort(), ['createdAt', 'id', 'name', 'ownerId', 'updatedAt']);
      assert.equal(new Date(first.createdAt).toISOString(), first.createdAt);
      assert.equal(new Date(first.updatedAt).toISOString(), first.updatedAt);
      const me = await request(a, 'GET', '/me');
      assert.equal(first.ownerId, me.body.id);
      const fetched = await request(a, 'GET', route(first));
      assert.equal(fetched.status, 200);
      assert.deepEqual(fetched.body, first);
      assert.equal(fetched.headers.get('cache-control'), 'no-store');
    });

    await t.test('name uniqueness is trimmed and case-insensitive within each owner', async () => {
      const duplicate = await request(a, 'POST', '/collections', { name: ' reading ' });
      assert.equal(duplicate.status, 409);
      assert.deepEqual(duplicate.body, { error: { code: 'COLLECTION_NAME_CONFLICT', message: 'Collection name already exists' } });
      other = await create(b, 'READING');
      assert.notEqual(other.ownerId, first.ownerId);
      assert.notEqual(other.id, first.id);
      await create(a, 'ÉCOLE');
      assert.equal((await request(a, 'POST', '/collections', { name: 'école' })).status, 409);
    });

    await t.test('list and total contain only the caller resources, including filtered empty pages', async () => {
      const list = await request(b, 'GET');
      assert.equal(list.status, 200);
      assert.deepEqual(list.body, { items: [other], page: 1, pageSize: 20, total: 1 });
      const empty = await request(b, 'GET', '/collections?name=%C3%A9cole');
      assert.deepEqual(empty.body, { items: [], page: 1, pageSize: 20, total: 0 });
      const filtered = await request(a, 'GET', '/collections?name=%20%C3%89cO%20');
      assert.equal(filtered.body.total, 1);
      assert.equal(filtered.body.items[0].name, 'ÉCOLE');
      assert.equal((await request(a, 'GET', '/collections?name=%20%20')).body.total, 2);
    });

    await t.test('foreign IDs behave like absent IDs for read, PUT, PATCH and DELETE without changing data', async () => {
      const before = await db.collection.findMany({ orderBy: { id: 'asc' } });
      for (const method of ['GET', 'PUT', 'PATCH', 'DELETE']) {
        const body = ['PUT', 'PATCH'].includes(method) ? { name: 'Stolen' } : undefined;
        const foreign = await request(b, method, route(first), body);
        const absent = await request(b, method, '/collections/absent', body);
        assert.equal(foreign.status, 404);
        assert.equal(absent.status, 404);
        assert.deepEqual(foreign.body, absent.body);
        assert.deepEqual(foreign.body, { error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      }
      // Also attempt a rename to the caller's existing name: no conflict information leaks.
      assert.equal((await request(b, 'PUT', route(first), { name: other.name })).status, 404);
      assert.deepEqual(await db.collection.findMany({ orderBy: { id: 'asc' } }), before);
    });

    await t.test('POST PUT PATCH reject unknown, immutable, empty, wrong-type and oversized fields', async () => {
      const invalid = [null, [], 'name', {}, { name: '' }, { name: '   ' }, { name: null }, { name: 1 },
        { name: 'x', ownerId: other.ownerId }, { name: 'x', id: other.id }, { name: 'x', createdAt: first.createdAt },
        { name: 'x', updatedAt: first.updatedAt }, { name: 'x', nameKey: 'evil' }, { name: 'x', extra: true }, { name: '😀'.repeat(101) }];
      const before = await db.collection.findMany({ orderBy: { id: 'asc' } });
      for (const method of ['POST', 'PUT', 'PATCH']) {
        for (const body of invalid) {
          const response = await request(a, method, method === 'POST' ? '/collections' : route(first), body);
          assert.equal(response.status, 400, `${method}: ${JSON.stringify(body)}`);
        }
      }
      assert.deepEqual(await db.collection.findMany({ orderBy: { id: 'asc' } }), before);
      const unicode = await create(a, '😀'.repeat(100));
      assert.equal([...unicode.name].length, 100);
    });

    await t.test('rejects ambiguous and unsupported query parameters', async () => {
      for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=1e2', 'page=', 'page=9007199254740992', 'page=9007199254740991&pageSize=100',
        'pageSize=101', 'pageSize=0', 'page=1&page=2', 'name=a&name=b', 'name[x]=a', 'ownerId=other', 'unexpected=x']) {
        assert.equal((await request(a, 'GET', `/collections?${query}`)).status, 400, query);
      }
      for (const method of ['GET', 'PUT', 'PATCH', 'DELETE']) {
        assert.equal((await request(a, method, route(first) + '?ownerId=other', ['PUT', 'PATCH'].includes(method) ? { name: 'Changed' } : undefined)).status, 400);
      }
      assert.equal((await request(a, 'POST', '/collections?page=1', { name: 'Changed' })).status, 400);
    });

    await t.test('filter matches literal percent, underscore and quotes without SQL injection', async () => {
      const percent = await create(a, '100% useful');
      const underscore = await create(a, 'my_notes');
      const quote = await create(a, "reader's list");
      for (const [name, expected] of [['%', percent], ['_', underscore], ["'", quote]]) {
        const result = await request(a, 'GET', '/collections?' + new URLSearchParams({ name }));
        assert.equal(result.status, 200);
        assert.deepEqual(result.body.items, [expected]);
        assert.equal(result.body.total, 1);
      }
      assert.equal((await request(a, 'GET', '/collections?' + new URLSearchParams({ name: "' OR 1=1 --" }))).body.total, 0);
    });

    await t.test('pagination has a stable ID tie-breaker and retains total beyond the final page', async () => {
      const created = await Promise.all(['Page A', 'Page B', 'Page C'].map((name) => create(a, name)));
      await db.collection.updateMany({ where: { ownerId: first.ownerId, id: { in: created.map((c) => c.id) } }, data: { createdAt: new Date('2026-01-01T00:00:00Z') } });
      const expected = created.map((c) => c.id).sort().reverse();
      const one = (await request(a, 'GET', '/collections?name=page&page=1&pageSize=2')).body;
      const two = (await request(a, 'GET', '/collections?name=page&page=2&pageSize=2')).body;
      assert.deepEqual([...one.items, ...two.items].map((c) => c.id), expected);
      assert.equal(one.total, 3);
      assert.equal(two.total, 3);
      const beyond = (await request(a, 'GET', '/collections?name=page&page=3&pageSize=2')).body;
      assert.deepEqual(beyond, { items: [], page: 3, pageSize: 2, total: 3 });
    });

    await t.test('PUT and PATCH rename only name, preserve identity and enforce conflicts', async () => {
      for (const method of ['PUT', 'PATCH']) {
        const renamed = await request(a, method, route(first), { name: `  ${method} name  ` });
        assert.equal(renamed.status, 200);
        assert.equal(renamed.body.name, `${method} name`);
        assert.equal(renamed.body.id, first.id);
        assert.equal(renamed.body.ownerId, first.ownerId);
        assert.equal(renamed.body.createdAt, first.createdAt);
        assert.ok(Date.parse(renamed.body.updatedAt) >= Date.parse(first.updatedAt));
        const conflict = await request(a, method, route(first), { name: 'école' });
        assert.equal(conflict.status, 409);
        assert.deepEqual((await request(a, 'GET', route(first))).body, renamed.body);
      }
    });

    await t.test('database uniqueness holds for concurrent creates and renames', async () => {
      const results = await Promise.all(Array.from({ length: 5 }, () => request(a, 'POST', '/collections', { name: 'Concurrent' })));
      assert.equal(results.filter((r) => r.status === 201).length, 1);
      assert.equal(results.filter((r) => r.status === 409).length, 4);
      assert.equal(await db.collection.count({ where: { ownerId: first.ownerId, nameKey: 'concurrent' } }), 1);
      const candidates = await Promise.all(['Rename A', 'Rename B'].map((name) => create(a, name)));
      const renames = await Promise.all(candidates.map((c) => request(a, 'PATCH', route(c), { name: 'Same Target' })));
      assert.deepEqual(renames.map((r) => r.status).sort(), [200, 409]);
    });

    await t.test('delete returns 204 and removes only the owner target; repeat returns 404', async () => {
      const count = await db.collection.count();
      const removed = await request(a, 'DELETE', route(first));
      assert.equal(removed.status, 204);
      assert.equal(removed.body, null);
      assert.equal(await db.collection.count(), count - 1);
      assert.equal((await request(a, 'GET', route(first))).status, 404);
      assert.equal((await request(a, 'DELETE', route(first))).status, 404);
      assert.deepEqual((await request(b, 'GET', route(other))).body, other);
    });
  } finally {
    if (app) await app.close();
    await new Promise((done) => jwks.close(done));
    if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe test cleanup path');
    rmSync(directory, { recursive: true, force: true });
  }
});
