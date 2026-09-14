import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { AppConfig } from '../config.js';

export interface VerifiedIdentity { issuer: string; subject: string }

export class AccessTokenVerifier {
  private readonly keys;

  constructor(private readonly config: AppConfig) {
    // Trust the configured issuer, never a key URL or issuer supplied in a JWT.
    this.keys = createRemoteJWKSet(new URL('.well-known/jwks.json', config.issuer), {
      timeoutDuration: 5000,
    });
  }

  async verify(token: string): Promise<VerifiedIdentity> {
    const { payload } = await jwtVerify(token, this.keys, {
      issuer: this.config.issuer,
      audience: this.config.audience,
      algorithms: ['RS256'],
      requiredClaims: ['iss', 'aud', 'sub', 'exp', 'iat'],
      clockTolerance: 5,
    });
    if (
      typeof payload.sub !== 'string' || !payload.sub.trim() ||
      payload.sub.endsWith('@clients') || payload.gty === 'client-credentials' ||
      typeof payload.iat !== 'number' || payload.iat > Date.now() / 1000 + 5
    ) {
      throw new Error('A signed-in user identity is required');
    }
    return { issuer: this.config.issuer, subject: payload.sub };
  }
}
