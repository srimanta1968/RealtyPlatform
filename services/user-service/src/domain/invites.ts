import { randomBytes } from 'node:crypto';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const { hash } = bcrypt;

import {
  StaffInviteAcceptRequestSchema,
  StaffInviteRequestSchema,
  type AuthSuccess,
  type PublicUser,
  type StaffInvite,
  type StaffInviteIssueResult,
} from '@kiana/contracts';

import type {
  StaffInviteRepository,
} from '../infra/staffInviteRepository.js';
import { toStaffInvite } from '../infra/staffInviteRepository.js';
import type { UserRepository } from '../infra/userRepository.js';
import type { NotificationDispatcher } from '../infra/notificationDispatcher.js';
import type { AuthDomain } from './auth.js';
import { EmailTakenError } from './auth.js';

export class InviteNotFoundError extends Error {
  constructor() {
    super('Invite token is invalid or has expired.');
    this.name = 'InviteNotFoundError';
  }
}

export interface InviteDomainOptions {
  invites: StaffInviteRepository;
  users: UserRepository;
  notifications: NotificationDispatcher;
  /** AuthDomain.issueSession() is reused so accept returns the same JWT shape. */
  authDomain: Pick<AuthDomain, 'getById'>;
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  publicBaseUrl: string;
  /** Time-to-live for an invite token. Defaults to 72h. */
  inviteTtlMs?: number;
  /** When true, issue() returns the token in the response (dev convenience). */
  exposeInviteToken?: boolean;
}

const DEFAULT_INVITE_TTL_MS = 72 * 60 * 60 * 1000;

/**
 * Admin-issued staff invitation flow. Two operations:
 *
 *   issue(input, actorId)  → admin creates a one-shot invite carrying
 *     the future role + email; an invite email is dispatched via the
 *     existing NotificationDispatcher.
 *   accept(input)         → public consumer redeems the token,
 *     creates a User row with the role baked into the invite, and
 *     returns a fresh JWT so the new account can sign in immediately.
 *
 * Tokens are randomBytes(32).hex (256-bit) and one-shot — accepting
 * marks the invite consumed so the URL can't be replayed.
 */
export class InviteDomain {
  constructor(private readonly options: InviteDomainOptions) {}

  async issue(input: unknown, actorId: string | null): Promise<StaffInviteIssueResult> {
    const parsed = StaffInviteRequestSchema.parse(input);
    const email = parsed.email.toLowerCase();
    const existing = await this.options.users.findByEmail(email);
    if (existing) {
      throw new EmailTakenError();
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + (this.options.inviteTtlMs ?? DEFAULT_INVITE_TTL_MS),
    );
    const row = await this.options.invites.insert({
      email,
      role: parsed.role,
      fullName: parsed.full_name ?? null,
      invitedBy: actorId,
      token,
      expiresAt,
    });

    const inviteUrl = `${this.options.publicBaseUrl.replace(/\/+$/, '')}/accept-invite?token=${token}`;
    // Reuse the verification dispatcher path — same shape, same
    // log-only/SES/SendGrid plumbing. Distinct templates can land
    // alongside the existing seed templates in P2.
    await this.options.notifications.sendEmailVerification({
      user_id: row.id,
      recipient: email,
      verification_token: token,
      verification_url: inviteUrl,
      expires_at: expiresAt.toISOString(),
    });

    const invite: StaffInvite = toStaffInvite(row);
    return {
      invite,
      ...(this.options.exposeInviteToken ? { token } : {}),
    };
  }

  async accept(input: unknown): Promise<AuthSuccess> {
    const parsed = StaffInviteAcceptRequestSchema.parse(input);
    const now = new Date();
    const row = await this.options.invites.findActiveByToken(parsed.token, now);
    if (!row) throw new InviteNotFoundError();

    const passwordHash = await hash(parsed.password, this.options.bcryptRounds);
    const user = await this.options.users.create({
      fullName: parsed.full_name ?? row.fullName ?? row.email,
      email: row.email,
      passwordHash,
      role: row.role as PublicUser['role'],
    });
    await this.options.invites.markAccepted(row.id, now);
    return this.signSessionToken(user);
  }

  private signSessionToken(user: PublicUser): AuthSuccess {
    // Narrow signing logic duplicated from AuthDomain.issueSession (P2:
    // lift into a shared helper once we have a JwtSigner abstraction).
    // Kept in lockstep via the shared PublicUser shape.
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      this.options.jwtSecret,
      { expiresIn: this.options.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
    );
    return { token, user };
  }
}
