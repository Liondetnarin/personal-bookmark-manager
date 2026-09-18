import 'reflect-metadata';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { createApp } from '../dist/create-app.js';
import { DatabaseService } from '../dist/database/database.service.js';
import { migrateTestDatabase } from './migrate.mjs';
import { seedTestUsers } from '../prisma/seed-test.mjs';

export async function fixture(frontendOrigin = 'http://localhost:3000') {
  const directory = mkdtempSync(join(tmpdir(), 'bookmark-full-'));
  const path = join(directory, 'test.db');
  let app;
  let server;
  const close = async () => {
    if (app) await app.close();
    if (server?.listening) await new Promise((done) => server.close(done));
    if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe test cleanup path');
    rmSync(directory, { recursive: true, force: true });
  };
  try {
    migrateTestDatabase(path);
    const keys = await generateKeyPair('RS256');
    const jwk = { ...await exportJWK(keys.publicKey), kid: 'fixture', use: 'sig', alg: 'RS256' };
    server = createServer((req, res) => {
      if (req.url !== '/.well-known/jwks.json') { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ keys: [jwk] }));
    });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const issuer = `http://127.0.0.1:${server.address().port}/`;
    const audience = 'https://isolated-bookmarks.test';
    app = await createApp({ issuer, audience, databaseUrl: `file:${path}`, frontendOrigin, port: 3001 }, false);
    await app.listen(0, '127.0.0.1');
    const db = app.get(DatabaseService);
    const users = await seedTestUsers(db, issuer);
    const sign = (sub) => new SignJWT({ sub }).setProtectedHeader({ alg: 'RS256', kid: 'fixture' })
      .setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime('30m').sign(keys.privateKey);
    const tokens = await Promise.all(users.map((u) => sign(u.subject)));
    const base = await app.getUrl();
    const request = async (token, method, route, body) => {
      const response = await fetch(base + route, { method,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : null };
    };
    return { db, users, tokens, base, request, close };
  } catch (error) { await close(); throw error; }
}
