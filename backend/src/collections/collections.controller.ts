import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import type { AuthRequest } from '../auth/auth.guard.js';
import { OwnerService } from '../auth/owner.service.js';
import { collectionName, collectionQuery, noQuery } from './collection-input.js';
import { CollectionsService } from './collections.service.js';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly owners: OwnerService, private readonly collections: CollectionsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Req() request: AuthRequest, @Query() query: Record<string, unknown>) {
    const input = collectionQuery(query);
    const owner = await this.owners.resolve(request.identity);
    return this.collections.list(owner.id, input);
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  async get(@Req() request: AuthRequest, @Param('id') id: string, @Query() query: Record<string, unknown>) {
    noQuery(query);
    const owner = await this.owners.resolve(request.identity);
    return this.collections.get(owner.id, id);
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  async create(@Req() request: AuthRequest, @Body() body: unknown, @Query() query: Record<string, unknown>) {
    noQuery(query);
    const input = collectionName(body);
    const owner = await this.owners.resolve(request.identity);
    return this.collections.create(owner.id, input);
  }

  @Put(':id')
  @Header('Cache-Control', 'no-store')
  async put(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: unknown, @Query() query: Record<string, unknown>) {
    return this.rename(request, id, body, query);
  }

  @Patch(':id')
  @Header('Cache-Control', 'no-store')
  async patch(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: unknown, @Query() query: Record<string, unknown>) {
    // Collection has only one editable field; both PUT and PATCH require a name.
    return this.rename(request, id, body, query);
  }

  private async rename(request: AuthRequest, id: string, body: unknown, query: Record<string, unknown>) {
    noQuery(query);
    const input = collectionName(body);
    const owner = await this.owners.resolve(request.identity);
    return this.collections.rename(owner.id, id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async remove(@Req() request: AuthRequest, @Param('id') id: string, @Query() query: Record<string, unknown>) {
    noQuery(query);
    const owner = await this.owners.resolve(request.identity);
    await this.collections.remove(owner.id, id);
  }
}
