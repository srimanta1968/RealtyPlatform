import { AuthClient, HttpClient, createBrowserTokenStorage } from '@kiana/sdk';
import type {
  AuthSuccess,
  CurrentSession,
  LogoutSuccess,
  ResendVerificationSuccess,
  VerifyEmailSuccess,
} from '@kiana/contracts';

const http = new HttpClient({
  baseUrl: '',
  tokenStorage: createBrowserTokenStorage(),
});

const authClient = new AuthClient(http);

/** Submit registration credentials and return the issued JWT + canonical user. */
export async function registerUser(email: string, password: string): Promise<AuthSuccess> {
  return authClient.register({ email, password });
}

/** Authenticate with registered credentials and return the issued JWT + user. */
export async function loginUser(email: string, password: string): Promise<AuthSuccess> {
  return authClient.login({ email, password });
}

/** Fetch the canonical user payload for the active session via GET /api/auth/me. */
export async function fetchCurrentUser(): Promise<CurrentSession> {
  return authClient.me();
}

/** End the active session — stateless JWT, so the client also clears its store. */
export async function logoutUser(): Promise<LogoutSuccess> {
  return authClient.logout();
}

/** Consume a verification token from the email link and mark the user verified. */
export async function verifyEmail(token: string): Promise<VerifyEmailSuccess> {
  return authClient.verifyEmail({ token });
}

/** Re-issue a verification email for the given account. */
export async function resendVerification(email: string): Promise<ResendVerificationSuccess> {
  return authClient.resendVerification({ email });
}
