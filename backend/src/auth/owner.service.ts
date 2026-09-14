import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { VerifiedIdentity } from './access-token.verifier.js';

@Injectable()
export class OwnerService {
  constructor(private readonly database: DatabaseService) {}

  resolve({ issuer, subject }: VerifiedIdentity) {
    // Called only with the guard's validated identity; /me is not a prerequisite.
    return this.database.user.upsert({
      where: { issuer_subject: { issuer, subject } },
      create: { issuer, subject },
      update: {},
      select: { id: true, subject: true },
    });
  }
}
