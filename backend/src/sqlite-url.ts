import { resolve } from 'node:path';

// Prisma migrations and the JS driver must resolve relative URLs identically.
// Commands run from the backend workspace, so file:./dev.db means backend/dev.db.
export function sqliteUrl(value: string): string {
  if (!value.startsWith('file:') || value.length === 5) throw new Error('A SQLite file URL is required');
  if (value === 'file::memory:') return value;
  return `file:${resolve(value.slice(5)).replaceAll('\\', '/')}`;
}
