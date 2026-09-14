import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

export function migrateTestDatabase(path) {
  const sql = new DatabaseSync(path);
  try {
    const root = new URL('../prisma/migrations/', import.meta.url);
    for (const entry of readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      sql.exec(readFileSync(new URL(`${entry.name}/migration.sql`, root), 'utf8'));
    }
  } finally { sql.close(); }
}
