import type { OnModuleDestroy } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';

export class DatabaseService extends PrismaClient implements OnModuleDestroy {
  constructor(url: string) {
    super({ adapter: new PrismaBetterSqlite3({ url }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
