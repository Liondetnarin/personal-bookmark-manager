export interface AuthConfig {
  domain: string;
  clientId: string;
  audience: string;
  apiUrl: string;
}

export function readAuthConfig(): AuthConfig | null {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN?.trim();
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID?.trim();
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE?.trim();
  const apiUrl = import.meta.env.VITE_API_URL?.trim();
  if (![domain, clientId, audience, apiUrl].every((value) => value && !value.includes('YOUR_'))) return null;
  try {
    const auth = new URL(`https://${domain}`);
    const api = new URL(apiUrl);
    if (auth.host !== domain || auth.pathname !== '/' || auth.search || auth.hash || auth.username || auth.password) return null;
    if (!['http:', 'https:'].includes(api.protocol) || apiUrl !== api.origin) return null;
    if (audience === clientId) return null;
    return { domain, clientId, audience, apiUrl };
  } catch {
    return null;
  }
}
