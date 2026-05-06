import type {
  ApiResponse,
  AuthSuccess,
  StaffInviteAcceptRequest,
  StaffInviteIssueResult,
  StaffInviteRequest,
} from '@kiana/contracts';

import { HttpClient } from '../../core/http-client.js';
import { SdkError } from '../../core/errors.js';

/**
 * SDK wrapper around the staff invite flow (Phase-1 Task 22). issue()
 * is admin-only; accept() is public — the token IS the auth.
 */
export class UserClient {
  constructor(private readonly http: HttpClient) {}

  /** POST /api/users/invite — admin issues a one-shot invite token. */
  async invite(input: StaffInviteRequest): Promise<StaffInviteIssueResult> {
    const response = await this.http.request<ApiResponse<StaffInviteIssueResult>>(
      '/api/users/invite',
      { method: 'POST', body: input },
    );
    return unwrap(response);
  }

  /** POST /api/users/accept-invite — public token redemption + user creation. */
  async acceptInvite(input: StaffInviteAcceptRequest): Promise<AuthSuccess> {
    const response = await this.http.request<ApiResponse<AuthSuccess>>(
      '/api/users/accept-invite',
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
