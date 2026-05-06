import { AuthClient, HttpClient, createBrowserTokenStorage } from '@kiana/sdk';
import type { AuthSuccess } from '@kiana/contracts';

const http = new HttpClient({
  baseUrl: '',
  tokenStorage: createBrowserTokenStorage(),
});

const authClient = new AuthClient(http);

/** Submit registration credentials and return the issued JWT + canonical user. */
export async function registerUser(email: string, password: string): Promise<AuthSuccess> {
  return authClient.register({ email, password });
}
