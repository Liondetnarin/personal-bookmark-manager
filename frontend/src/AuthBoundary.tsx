import type { ReactNode } from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { useNavigate } from 'react-router';
import type { AuthConfig } from './auth-config';

export function AuthBoundary({ config, children }: { config: AuthConfig; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <Auth0Provider
      domain={config.domain}
      clientId={config.clientId}
      authorizationParams={{
        redirect_uri: `${window.location.origin}/callback`,
        audience: config.audience,
        scope: 'openid profile email',
      }}
      cacheLocation="memory"
      useRefreshTokens={false}
      onRedirectCallback={() => navigate('/', { replace: true })}
    >
      {children}
    </Auth0Provider>
  );
}
