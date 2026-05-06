import { z } from 'zod';

import { UserRole } from '../enums/index.js';
import type { UserId } from '../primitives/ids.js';

const UserRoleSchema = z.enum([
  UserRole.ADMIN,
  UserRole.PRESALES,
  UserRole.FIELD_AGENT,
  UserRole.MARKETER,
  UserRole.CUSTOMER,
]);

export const RegisterRequestSchema = z.object({
  full_name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const VerifyEmailRequestSchema = z.object({
  token: z.string().min(20).max(200),
});
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;

export const ResendVerificationRequestSchema = z.object({
  email: z.string().trim().email(),
});
export type ResendVerificationRequest = z.infer<typeof ResendVerificationRequestSchema>;

export interface PublicUser {
  id: UserId;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
  email_verified_at: string | null;
}

/**
 * Returned alongside register / resend-verification. The `token` field is
 * populated only in non-production environments so the API test runner can
 * chain into POST /api/auth/verify-email. Production responses omit it.
 */
export interface VerificationDetails {
  expires_at: string;
  token?: string;
}

export interface AuthSuccess {
  token: string;
  user: PublicUser;
  /** Present when registration just issued a fresh email-verification token. */
  verification?: VerificationDetails;
}

export interface VerifyEmailSuccess {
  user: PublicUser;
}

export interface CurrentSession {
  user: PublicUser;
}

export interface LogoutSuccess {
  /** ISO timestamp the server logged the logout at. */
  logged_out_at: string;
}

export interface ResendVerificationSuccess {
  verification: VerificationDetails;
}

export interface ApiError {
  success: false;
  error: string;
  field?: string;
}

export interface ApiOk<T> {
  success: true;
  data: T;
}

export type ApiResponse<T> = ApiOk<T> | ApiError;

/**
 * Phase-1 Task #22 — admin invites a future staff member. Role is
 * baked into the invite so the accept handler can't be tricked into
 * creating an admin account from a presales invite (or vice-versa).
 * `customer` role is rejected; customers self-register.
 */
export const StaffInviteRequestSchema = z.object({
  email: z.string().trim().email(),
  role: UserRoleSchema.refine((r) => r !== 'customer', {
    message: 'Customer accounts self-register; pick a staff role.',
  }),
  full_name: z.string().trim().min(1).max(200).optional(),
});
export type StaffInviteRequest = z.infer<typeof StaffInviteRequestSchema>;

export const StaffInviteAcceptRequestSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(200),
  full_name: z.string().trim().min(1).max(200).optional(),
});
export type StaffInviteAcceptRequest = z.infer<typeof StaffInviteAcceptRequestSchema>;

export interface StaffInvite {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface StaffInviteIssueResult {
  invite: StaffInvite;
  /** Populated only outside production so dev / tests can chain. */
  token?: string;
}
