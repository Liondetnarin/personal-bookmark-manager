import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { OwnerService } from '../auth/owner.service.js';
import type { AuthRequest } from '../auth/auth.guard.js';
import { noQuery } from '../collections/collection-input.js';
import { bookmarkBody, bookmarkQuery } from './bookmark-input.js';
import { BookmarksService } from './bookmarks.service.js';

@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly owners: OwnerService, private readonly bookmarks: BookmarksService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Req() request: AuthRequest, @Query() query: Record<string, unknown>) {
    const input = bookmarkQuery(query);
    const owner = await this.owners.resolve(request.identity);
    return this.bookmarks.list(owner.id, input);
  }
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  async get(@Req() request: AuthRequest, @Param('id') id: string, @Query() query: Record<string, unknown>) {
    noQuery(query);
    return this.bookmarks.get((await this.owners.resolve(request.identity)).id, id);
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  async create(@Req() request: AuthRequest, @Body() body: unknown, @Query() query: Record<string, unknown>) {
    noQuery(query);
    const data = bookmarkBody(body, 'replace');
    return this.bookmarks.create((await this.owners.resolve(request.identity)).id, data);
  }
  @Put(':id')
  @Header('Cache-Control', 'no-store')
  async put(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: unknown, @Query() query: Record<string, unknown>) {
    noQuery(query);
    const data = bookmarkBody(body, 'replace');
    return this.bookmarks.update((await this.owners.resolve(request.identity)).id, id, data);
  }
  @Patch(':id')
  @Header('Cache-Control', 'no-store')
  async patch(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: unknown, @Query() query: Record<string, unknown>) {
    noQuery(query);
    const data = bookmarkBody(body, 'patch');
    return this.bookmarks.update((await this.owners.resolve(request.identity)).id, id, data);
  }
  @Delete(':id')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async remove(@Req() request: AuthRequest, @Param('id') id: string, @Query() query: Record<string, unknown>) {
    noQuery(query);
    await this.bookmarks.remove((await this.owners.resolve(request.identity)).id, id);
  }
}

@Controller('collections/:id/bookmarks')
export class CollectionBookmarksController {
  constructor(private readonly owners: OwnerService, private readonly bookmarks: BookmarksService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Req() request: AuthRequest, @Param('id') id: string, @Query() query: Record<string, unknown>) {
    const input = bookmarkQuery(query, true);
    return this.bookmarks.list((await this.owners.resolve(request.identity)).id, { ...input, collectionId: id });
  }
}
