export interface TokenStorage {
  read(): string | null;
  write(token: string): void;
  clear(): void;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/** Browser localStorage-backed token storage. Returns null on the server. */
export function createBrowserTokenStorage(): TokenStorage {
  return {
    read() {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(TOKEN_KEY);
    },
    write(token) {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(TOKEN_KEY, token);
    },
    clear() {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    },
  };
}

export const authKeys = {
  token: TOKEN_KEY,
  user: USER_KEY,
};
