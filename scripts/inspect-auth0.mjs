// Reads public metadata only. This is not a login or token-validation test.
const input = process.argv[2];

if (!input || input === '--help') {
  console.log('Usage: npm run auth:inspect -- YOUR_TENANT.us.auth0.com');
  console.log('Use your own canonical Auth0 domain. No secrets or tokens are needed.');
  process.exitCode = input ? 0 : 1;
} else {
  try {
    const domain = new URL(input.includes('://') ? input : `https://${input}`);
    if (
      domain.protocol !== 'https:' || domain.port || domain.username || domain.password ||
      domain.pathname !== '/' || domain.search || domain.hash ||
      !domain.hostname.endsWith('.auth0.com') ||
      /YOUR_|[<>]/i.test(input)
    ) {
      throw new Error('Provide your own canonical HTTPS Auth0 domain, without paths, credentials or placeholders.');
    }

    const issuer = `${domain.origin}/`;
    async function readJson(url) {
      const response = await fetch(url, {
        redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Metadata request failed: HTTP ${response.status}`);
      return response.json();
    }

    const discovery = await readJson(new URL('.well-known/openid-configuration', issuer));
    if (discovery.issuer !== issuer) throw new Error('Discovery issuer does not match the requested tenant.');
    if (typeof discovery.jwks_uri !== 'string') throw new Error('Discovery has no JWKS URL.');
    const jwksUrl = new URL(discovery.jwks_uri);
    if (jwksUrl.origin !== domain.origin || jwksUrl.username || jwksUrl.password || jwksUrl.hash) {
      throw new Error('JWKS URL must stay on the requested tenant origin.');
    }
    const jwks = await readJson(jwksUrl);
    if (!Array.isArray(jwks.keys) || jwks.keys.length === 0) throw new Error('JWKS has no keys.');

    console.log(JSON.stringify({
      inspectedAt: new Date().toISOString(), issuer,
      authorizationEndpoint: discovery.authorization_endpoint,
      tokenEndpoint: discovery.token_endpoint,
      jwksUri: discovery.jwks_uri,
      responseTypesSupported: discovery.response_types_supported ?? [],
      grantTypesSupported: discovery.grant_types_supported ?? [],
      codeChallengeMethodsSupported: discovery.code_challenge_methods_supported ?? [],
      idTokenSigningAlgorithmsSupported: discovery.id_token_signing_alg_values_supported ?? [],
      publicKeyMetadata: jwks.keys.map(({ kid, kty, use, alg }) => ({ kid, kty, use, alg })),
      limits: [
        'Advertised ID-token algorithms do not prove this API access-token algorithm.',
        'Verify API audience and signing settings in your own Dashboard separately.',
        'This does not prove login, PKCE, token validation or ownership enforcement.',
        'An absent metadata field means not advertised, not necessarily unsupported.',
      ],
    }, null, 2));
  } catch (error) {
    // Do not dump remote response bodies or potentially credential-bearing input.
    console.error(error instanceof Error ? error.message : 'Metadata inspection failed.');
    process.exitCode = 1;
  }
}
