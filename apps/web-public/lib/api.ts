import {
  AuthClient,
  HttpClient,
  LeadClient,
  PropertyClient,
  createBrowserTokenStorage,
  type PropertyListFilter,
} from '@kiana/sdk';
import type {
  AuthSuccess,
  CurrentSession,
  LeadCreateRequest,
  LeadRecord,
  LeadSourceSummary,
  LogoutSuccess,
  PropertyRecord,
  ResendVerificationSuccess,
  VerifyEmailSuccess,
} from '@kiana/contracts';

const http = new HttpClient({
  baseUrl: '',
  tokenStorage: createBrowserTokenStorage(),
});

const authClient = new AuthClient(http);
const leadClient = new LeadClient(http);
const propertyClient = new PropertyClient(http);

/** Submit registration credentials and return the issued JWT + canonical user. */
export async function registerUser(
  fullName: string,
  email: string,
  password: string,
): Promise<AuthSuccess> {
  return authClient.register({ full_name: fullName, email, password });
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

/** Submit a public lead-capture form. Source defaults to 'web_form' if omitted. */
export async function createLead(input: LeadCreateRequest): Promise<LeadRecord> {
  return leadClient.create(input);
}

/** Discover the catalog of accepted sources + current per-source lead counts. */
export async function listLeadSources(): Promise<LeadSourceSummary> {
  return leadClient.listSources();
}

/** GET /api/properties — public list of published properties (with optional filters). */
export async function listProperties(filter: PropertyListFilter = {}): Promise<PropertyRecord[]> {
  return propertyClient.list(filter);
}

/** GET /api/properties/:slug — public property detail by URL slug. */
export async function getPropertyBySlug(slug: string): Promise<PropertyRecord> {
  return propertyClient.getBySlug(slug);
}
