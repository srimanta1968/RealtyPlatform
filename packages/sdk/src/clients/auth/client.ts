import type {
  ApiResponse,
  AuthSuccess,
  CurrentSession,
  LoginRequest,
  LogoutSuccess,
  RegisterRequest,
  ResendVerificationRequest,
  ResendVerificationSuccess,
  VerifyEmailRequest,
  VerifyEmailSuccess,
} from '@kiana/contracts';

import { HttpClient } from '../../core/http-client.js';
import { SdkError } from '../../core/errors.js';

export class AuthClient {
  constructor(private readonly http: HttpClient) {}

  /** POST /api/auth/register — create a new account, return JWT + verification token. */
  async register(input: RegisterRequest): Promise<AuthSuccess> {
    const response = await this.http.request<ApiResponse<AuthSuccess>>('/api/auth/register', {
      method: 'POST',
      body: input,
      authenticated: false,
    });
    return unwrap(response);
  }

  /** POST /api/auth/login — authenticate an existing account and return JWT. */
  async login(input: LoginRequest): Promise<AuthSuccess> {
    const response = await this.http.request<ApiResponse<AuthSuccess>>('/api/auth/login', {
      method: 'POST',
      body: input,
      authenticated: false,
    });
    return unwrap(response);
  }

  /** GET /api/auth/me — fetch the canonical user record for the current session. */
  async me(): Promise<CurrentSession> {
    const response = await this.http.request<ApiResponse<CurrentSession>>('/api/auth/me');
    return unwrap(response);
  }

  /** POST /api/auth/logout — terminate the current session (stateless JWT in Phase 1). */
  async logout(): Promise<LogoutSuccess> {
    const response = await this.http.request<ApiResponse<LogoutSuccess>>('/api/auth/logout', {
      method: 'POST',
      body: {},
    });
    return unwrap(response);
  }

  /** POST /api/auth/verify-email — consume a verification token, mark user verified. */
  async verifyEmail(input: VerifyEmailRequest): Promise<VerifyEmailSuccess> {
    const response = await this.http.request<ApiResponse<VerifyEmailSuccess>>(
      '/api/auth/verify-email',
      { method: 'POST', body: input, authenticated: false },
    );
    return unwrap(response);
  }

  /** POST /api/auth/resend-verification — re-issue a verification token + email. */
  async resendVerification(input: ResendVerificationRequest): Promise<ResendVerificationSuccess> {
    const response = await this.http.request<ApiResponse<ResendVerificationSuccess>>(
      '/api/auth/resend-verification',
      { method: 'POST', body: input, authenticated: false },
    );
    return unwrap(response);
  }
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new SdkError(response.error, 400, response);
  }
  return response.data;
}
