import { sqliteUrl } from './sqlite-url.js';

export interface AppConfig {
  issuer: string;
  audience: string;
  databaseUrl: string;
  frontendOrigin: string;
  port: number;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const required = (name: string): string => {
    const value = env[name]?.trim();
    if (!value || value.includes('YOUR_')) throw new Error(`Configure ${name} in backend/.env`);
    return value;
  };
  const issuer = required('AUTH0_ISSUER');
  const url = new URL(issuer);
  if (url.protocol !== 'https:' || url.username || url.password || issuer !== `${url.origin}/`) {
    throw new Error('AUTH0_ISSUER must be an HTTPS origin with a trailing slash');
  }
  const audience = required('AUTH0_AUDIENCE');
  if (audience === issuer || audience === `${issuer}userinfo`) {
    throw new Error('AUTH0_AUDIENCE must identify the custom API');
  }
  const databaseUrl = sqliteUrl(required('DATABASE_URL'));
  if (!databaseUrl.startsWith('file:')) throw new Error('DATABASE_URL must be a SQLite file URL');
  const frontendOrigin = env.FRONTEND_ORIGIN ?? 'http://localhost:3000';
  const origin = new URL(frontendOrigin);
  if (!['http:', 'https:'].includes(origin.protocol) || frontendOrigin !== origin.origin) {
    throw new Error('FRONTEND_ORIGIN must be an HTTP(S) origin');
  }
  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  return { issuer, audience, databaseUrl, frontendOrigin, port };
}
