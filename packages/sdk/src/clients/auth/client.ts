import type {
  ApiResponse,
  AuthSuccess,
  LoginRequest,
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
