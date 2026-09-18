import { BadRequestException } from '@nestjs/common';
import { pagination } from '../pagination.js';

export function bookmarkTitle(value: unknown): string {
  if (typeof value !== 'string') throw new BadRequestException();

  const title = value.trim();
  const length = [...title].length;
  if (length < 1 || length > 200) throw new BadRequestException();

  return title;
}

export function bookmarkUrl(value: unknown): string {
  if (typeof value !== 'string') throw new BadRequestException();

  const url = value.trim();
  if ([...url].length > 2048 || !/^https?:\/\/[^/\\]/i.test(url)) throw new BadRequestException();

  let parsed: URL;
  try {
    // No base URL: relative references cannot pass as complete bookmark URLs.
    parsed = new URL(url);
  } catch {
    // Parser errors can include the input; return only the generic validation error.
    throw new BadRequestException();
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname ||
    parsed.username || parsed.password) {
    throw new BadRequestException();
  }

  // Preserve the submitted link after trimming; validation does not fetch it.
  return url;
}

export interface BookmarkInput {
  title: string;
  url: string;
  notes: string | null;
  collectionId: string | null;
}

export function bookmarkBody(body: unknown, mode: 'replace'): BookmarkInput;
export function bookmarkBody(body: unknown, mode: 'patch'): Partial<BookmarkInput>;
export function bookmarkBody(body: unknown, mode: 'replace' | 'patch'): Partial<BookmarkInput> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException();
  const input = body as Record<string, unknown>;
  const keys = Object.keys(input);
  if (!keys.length || keys.some((key) => !['title', 'url', 'notes', 'collectionId'].includes(key))) throw new BadRequestException();
  const data: Partial<BookmarkInput> = {};
  if (mode === 'replace' || 'title' in input) data.title = bookmarkTitle(input.title);
  if (mode === 'replace' || 'url' in input) data.url = bookmarkUrl(input.url);
  if (mode === 'replace' || 'notes' in input) {
    const notes = input.notes === undefined && mode === 'replace' ? null : input.notes;
    if (notes !== null && (typeof notes !== 'string' || [...notes].length > 5000)) throw new BadRequestException();
    data.notes = notes as string | null;
  }
  if (mode === 'replace' || 'collectionId' in input) {
    const id = input.collectionId === undefined && mode === 'replace' ? null : input.collectionId;
    if (id !== null && (typeof id !== 'string' || !id.length)) throw new BadRequestException();
    data.collectionId = id as string | null;
  }
  return data;
}

export function bookmarkQuery(query: Record<string, unknown>, nested = false) {
  const allowed = nested ? ['page', 'pageSize'] : ['page', 'pageSize', 'collectionId', 'uncategorised'];
  if (Object.keys(query).some((key) => !allowed.includes(key))) throw new BadRequestException();
  if (query.collectionId !== undefined && (typeof query.collectionId !== 'string' || !query.collectionId.length)) throw new BadRequestException();
  if (query.uncategorised !== undefined && query.uncategorised !== 'true') throw new BadRequestException();
  if (query.collectionId !== undefined && query.uncategorised !== undefined) throw new BadRequestException();
  return { ...pagination(query), collectionId: query.collectionId as string | undefined, uncategorised: query.uncategorised === 'true' };
}
