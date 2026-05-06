'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { PublicUser } from '@kiana/contracts';
import { authKeys, AuthClient, HttpClient, createBrowserTokenStorage } from '@kiana/sdk';

export interface AuthContextValue {
  user: PublicUser | null;
  token: string | null;
  setSession: (token: string, user: PublicUser) => void;
  clearSession: () => void;
  /** Re-fetches /api/auth/me to confirm the cached token still authorizes a session. */
  validateSession: () => Promise<PublicUser | null>;
  hydrated: boolean;
  validating: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
  /**
   * Origin to use when calling /api/auth/me + /api/auth/logout. Defaults to
   * the current origin (empty string) so Next.js rewrites can route the
   * request to the BFF.
   */
  apiBaseUrl?: string;
  /** Skip the on-mount /api/auth/me probe (useful for tests). */
  skipAutoValidate?: boolean;
}

export function AuthProvider({
  children,
  apiBaseUrl = '',
  skipAutoValidate = false,
}: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [validating, setValidating] = useState(false);
  const validatedOnce = useRef(false);

  const authClient = useMemo(() => {
    const http = new HttpClient({ baseUrl: apiBaseUrl, tokenStorage: createBrowserTokenStorage() });
    return new AuthClient(http);
  }, [apiBaseUrl]);

  const setSession = useCallback((nextToken: string, nextUser: PublicUser) => {
    setToken(nextToken);
    setUser(nextUser);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(authKeys.token, nextToken);
      window.localStorage.setItem(authKeys.user, JSON.stringify(nextUser));
    }
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(authKeys.token);
      window.localStorage.removeItem(authKeys.user);
    }
  }, []);

  const validateSession = useCallback(async (): Promise<PublicUser | null> => {
    setValidating(true);
    try {
      const session = await authClient.me();
      setUser(session.user);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(authKeys.user, JSON.stringify(session.user));
      }
      return session.user;
    } catch {
      clearSession();
      return null;
    } finally {
      setValidating(false);
    }
  }, [authClient, clearSession]);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    if (typeof window === 'undefined') {
      setHydrated(true);
      return;
    }
    try {
      const storedToken = window.localStorage.getItem(authKeys.token);
      const storedUser = window.localStorage.getItem(authKeys.user);
      if (storedToken) setToken(storedToken);
      if (storedUser) setUser(JSON.parse(storedUser) as PublicUser);
    } catch {
      // Ignore — bad JSON resets session.
    } finally {
      setHydrated(true);
    }
  }, []);

  // After hydration, probe /api/auth/me once to confirm the token is still valid.
  useEffect(() => {
    if (!hydrated || skipAutoValidate || validatedOnce.current) return;
    if (!token) return;
    validatedOnce.current = true;
    void validateSession();
  }, [hydrated, skipAutoValidate, token, validateSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, setSession, clearSession, validateSession, hydrated, validating }),
    [user, token, setSession, clearSession, validateSession, hydrated, validating],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() called outside of <AuthProvider>');
  }
  return ctx;
}
