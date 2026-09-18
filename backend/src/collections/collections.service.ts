import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { collectionQuery } from './collection-input.js';

const select = { id: true, name: true, ownerId: true, createdAt: true, updatedAt: true } as const;
const orderBy = [{ createdAt: 'desc' }, { id: 'desc' }] as const;

@Injectable()
export class CollectionsService {
  constructor(private readonly database: DatabaseService) {}

  async list(ownerId: string, { page, pageSize, skip, name }: ReturnType<typeof collectionQuery>) {
    return this.database.$transaction(async (tx) => {
      // instr treats % and _ as literal text, unlike SQL LIKE. Parameters remain bound.
      // Fetch only this owner's page of IDs, then let Prisma serialize resource dates.
      const ids = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM Collection WHERE ownerId = ${ownerId} AND instr(nameKey, ${name}) > 0
        ORDER BY createdAt DESC, id DESC LIMIT ${pageSize} OFFSET ${skip}`;
      const counts = await tx.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(*) AS total FROM Collection WHERE ownerId = ${ownerId} AND instr(nameKey, ${name}) > 0`;
      const items = await tx.collection.findMany({
        where: { ownerId, id: { in: ids.map(({ id }) => id) } }, select, orderBy: [...orderBy],
      });
      return { items, page, pageSize, total: Number(counts[0].total) };
    });
  }

  async get(ownerId: string, id: string) {
    const collection = await this.database.collection.findFirst({ where: { id, ownerId }, select });
    if (!collection) throw new NotFoundException();
    return collection;
  }

  async create(ownerId: string, data: { name: string; nameKey: string }) {
    try {
      return await this.database.collection.create({ data: { ...data, ownerId }, select });
    } catch (error) { return this.rethrow(error); }
  }

  async rename(ownerId: string, id: string, data: { name: string; nameKey: string }) {
    try {
      // Owner scoping is inside the mutation, not just a prior permission check.
      return await this.database.collection.update({ where: { id, ownerId }, data, select });
    } catch (error) { return this.rethrow(error); }
  }

  async remove(ownerId: string, id: string): Promise<void> {
    try {
      await this.database.$transaction(async (tx) => {
        if (!await tx.collection.findFirst({ where: { id, ownerId }, select: { id: true } })) throw new NotFoundException();
        await tx.bookmark.updateMany({ where: { collectionId: id, ownerId }, data: { collectionId: null } });
        await tx.collection.delete({ where: { id, ownerId } });
      });
    } catch (error) { this.rethrow(error); }
  }

  private rethrow(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw new ConflictException();
      if (error.code === 'P2025') throw new NotFoundException();
    }
    throw error;
  }
}
