import { BadRequestException, Controller, Get, Header, Query, Req } from '@nestjs/common';
import type { AuthRequest } from './auth/auth.guard.js';
import { OwnerService } from './auth/owner.service.js';

@Controller('me')
export class MeController {
  constructor(private readonly owners: OwnerService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async getMe(@Req() request: AuthRequest, @Query() query: Record<string, unknown>) {
    if (Object.keys(query).length) throw new BadRequestException();
    // Only the verified pair identifies the owner. Ignore IDs supplied by callers.
    return this.owners.resolve(request.identity);
  }
}
