import { AuthClient, HttpClient, createBrowserTokenStorage } from '@kiana/sdk';
import type {
  AuthSuccess,
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

/** Consume a verification token from the email link and mark the user verified. */
export async function verifyEmail(token: string): Promise<VerifyEmailSuccess> {
  return authClient.verifyEmail({ token });
}

/** Re-issue a verification email for the given account. */
export async function resendVerification(email: string): Promise<ResendVerificationSuccess> {
  return authClient.resendVerification({ email });
}
