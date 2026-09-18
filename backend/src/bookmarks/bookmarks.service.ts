import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { BookmarkInput, bookmarkQuery } from './bookmark-input.js';

const select = { id: true, url: true, title: true, notes: true, collectionId: true, ownerId: true, createdAt: true, updatedAt: true } as const;

@Injectable()
export class BookmarksService {
  constructor(private readonly database: DatabaseService) {}

  private async checkCollection(tx: Prisma.TransactionClient, ownerId: string, id: string | null | undefined) {
    if (id !== null && id !== undefined && !await tx.collection.findFirst({ where: { id, ownerId }, select: { id: true } })) throw new NotFoundException();
  }

  async list(ownerId: string, query: ReturnType<typeof bookmarkQuery>) {
    return this.database.$transaction(async (tx) => {
      await this.checkCollection(tx, ownerId, query.collectionId);
      const where = { ownerId, ...(query.collectionId !== undefined ? { collectionId: query.collectionId } : query.uncategorised ? { collectionId: null } : {}) };
      const items = await tx.bookmark.findMany({ where, select, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: query.skip, take: query.pageSize });
      const total = await tx.bookmark.count({ where });
      return { items, page: query.page, pageSize: query.pageSize, total };
    });
  }

  async get(ownerId: string, id: string) {
    const item = await this.database.bookmark.findFirst({ where: { id, ownerId }, select });
    if (!item) throw new NotFoundException();
    return item;
  }

  async create(ownerId: string, data: BookmarkInput) {
    return this.database.$transaction(async (tx) => {
      await this.checkCollection(tx, ownerId, data.collectionId);
      return tx.bookmark.create({ data: { ...data, ownerId }, select });
    });
  }

  async update(ownerId: string, id: string, data: Partial<BookmarkInput>) {
    return this.database.$transaction(async (tx) => {
      if (!await tx.bookmark.findFirst({ where: { id, ownerId }, select: { id: true } })) throw new NotFoundException();
      await this.checkCollection(tx, ownerId, data.collectionId);
      return tx.bookmark.update({ where: { id, ownerId }, data, select });
    });
  }

  async remove(ownerId: string, id: string) {
    const result = await this.database.bookmark.deleteMany({ where: { id, ownerId } });
    if (!result.count) throw new NotFoundException();
  }
}
