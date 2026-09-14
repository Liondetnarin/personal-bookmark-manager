import { defineConfig } from 'prisma/config';
import { sqliteUrl } from './src/sqlite-url';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Generation works without secrets; actual migration requires DATABASE_URL.
  datasource: { url: sqliteUrl(process.env.DATABASE_URL ?? 'file:./dev.db') },
});
