// Only the test-created Vite server aliases Auth0 to this module. Production never imports it.
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
declare const __TEST_TOKENS__: string[];
declare const __TEST_SUBJECTS__: string[];
declare global { interface Window { __TEST_USER_INDEX__?: number } }
const Context = createContext<any>(null);
export function Auth0Provider({ children }: { children: ReactNode }) {
  const index = window.__TEST_USER_INDEX__ ?? 0;
  const [authenticated, setAuthenticated] = useState(!new URLSearchParams(location.search).has('testSignedOut'));
  const token = useCallback(async () => __TEST_TOKENS__[index], [index]);
  return <Context.Provider value={{
    isLoading: false, isAuthenticated: authenticated, error: undefined,
    user: authenticated ? { sub: __TEST_SUBJECTS__[index], name: index ? 'Demo Reader B' : 'Demo Reader A' } : undefined,
    getAccessTokenSilently: token,
    loginWithRedirect: async () => setAuthenticated(true),
    logout: async () => { window.location.assign('/?testSignedOut=1'); },
  }}>{children}</Context.Provider>;
}
export const useAuth0 = () => useContext(Context);
