import { z } from 'zod';

import type { UserId } from '../primitives/ids.js';

export const RegisterRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export interface PublicUser {
  id: UserId;
  email: string;
  created_at: string;
}

export interface AuthSuccess {
  token: string;
  user: PublicUser;
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
