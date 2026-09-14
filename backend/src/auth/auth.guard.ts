import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { AccessTokenVerifier } from './access-token.verifier.js';
import type { VerifiedIdentity } from './access-token.verifier.js';

export interface AuthRequest {
  headers: { authorization?: string };
  identity: VerifiedIdentity;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly verifier: AccessTokenVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const match = request.headers.authorization?.match(/^Bearer ([^\s,]+)$/i);
    if (!match) throw new UnauthorizedException();
    try {
      request.identity = await this.verifier.verify(match[1]);
      return true;
    } catch {
      // Do not disclose signature/issuer details or echo tokens to the caller.
      throw new UnauthorizedException();
    }
  }
}
