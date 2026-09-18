import { BadRequestException } from '@nestjs/common';
import { pagination } from '../pagination.js';

export function noQuery(query: Record<string, unknown>): void {
  if (Object.keys(query).length) throw new BadRequestException();
}

export function collectionName(body: unknown): { name: string; nameKey: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
    Object.keys(body).length !== 1 || !('name' in body) || typeof body.name !== 'string') {
    throw new BadRequestException();
  }
  const name = body.name.trim();
  const length = [...name].length;
  if (length < 1 || length > 100) throw new BadRequestException();
  return { name, nameKey: name.toLowerCase() };
}

export function collectionQuery(query: Record<string, unknown>) {
  if (Object.keys(query).some((key) => !['page', 'pageSize', 'name'].includes(key))) {
    throw new BadRequestException();
  }
  const { page, pageSize, skip } = pagination(query);
  if (query.name !== undefined && typeof query.name !== 'string') throw new BadRequestException();
  const name = (query.name as string | undefined)?.trim().toLowerCase() ?? '';
  return { page, pageSize, skip, name };
}
