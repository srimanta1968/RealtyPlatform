import type { ApiResponse, AuthSuccess, LoginRequest, RegisterRequest } from '@kiana/contracts';

import { HttpClient } from '../../core/http-client.js';
import { SdkError } from '../../core/errors.js';

export class AuthClient {
  constructor(private readonly http: HttpClient) {}

  /** POST /api/auth/register — create a new account and return JWT + public user. */
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
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new SdkError(response.error, 400, response);
  }
  return response.data;
}
