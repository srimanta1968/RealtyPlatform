import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { PublicUser } from '@kiana/contracts';
import { authKeys } from '@kiana/sdk';

export interface AuthContextValue {
  user: PublicUser | null;
  token: string | null;
  setSession: (token: string, user: PublicUser) => void;
  clearSession: () => void;
  hydrated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

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

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, setSession, clearSession, hydrated }),
    [user, token, setSession, clearSession, hydrated],
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
