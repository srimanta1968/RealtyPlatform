import { randomBytes } from 'node:crypto';

import { compare, hash } from 'bcryptjs';
import jwt from 'jsonwebtoken';

import {
  LoginRequestSchema,
  RegisterRequestSchema,
  ResendVerificationRequestSchema,
  VerifyEmailRequestSchema,
  type AuthSuccess,
  type PublicUser,
  type ResendVerificationSuccess,
  type VerifyEmailSuccess,
} from '@kiana/contracts';

import type { UserRepository } from '../infra/userRepository.js';
import type { NotificationDispatcher } from '../infra/notificationDispatcher.js';

export class EmailTakenError extends Error {
  constructor() {
    super('An account with this email already exists.');
    this.name = 'EmailTakenError';
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super('No account is registered with this email.');
    this.name = 'UserNotFoundError';
  }
}

export class InvalidVerificationTokenError extends Error {
  constructor() {
    super('Verification link is invalid or has expired.');
    this.name = 'InvalidVerificationTokenError';
  }
}

export class AlreadyVerifiedError extends Error {
  constructor() {
    super('This email address is already verified.');
    this.name = 'AlreadyVerifiedError';
  }
}

/**
 * Thrown for both "no such email" and "wrong password" so the API never
 * reveals which case applied — that prevents account enumeration.
 */
export class InvalidCredentialsError extends Error {
  constructor() {
    super('Email or password is incorrect.');
    this.name = 'InvalidCredentialsError';
  }
}

export interface AuthDomainOptions {
  repository: UserRepository;
  notifications: NotificationDispatcher;
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  /** Frontend base URL used to build verification links (e.g. http://localhost:3000). */
  publicBaseUrl: string;
  /** Verification token TTL in milliseconds. Defaults to 24h. */
  verificationTtlMs?: number;
  /** When true, the verification token is included in API responses (dev only). */
  exposeVerificationToken?: boolean;
}

const DEFAULT_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export class AuthDomain {
  constructor(private readonly options: AuthDomainOptions) {}

  /**
   * Validate input, persist a new user, issue a verification token, and dispatch
   * the verification email. Returns the JWT + user + verification metadata.
   * Throws ZodError on bad input or EmailTakenError on duplicate email.
   */
  async register(input: unknown): Promise<AuthSuccess> {
    const parsed = RegisterRequestSchema.parse(input);
    const email = parsed.email.toLowerCase();

    const existing = await this.options.repository.findByEmail(email);
    if (existing) {
      throw new EmailTakenError();
    }

    const passwordHash = await hash(parsed.password, this.options.bcryptRounds);
    const user = await this.options.repository.create({ email, passwordHash });
    const verification = await this.issueVerification(user);
    return { ...this.issueSession(user), verification };
  }

  /**
   * Authenticate a registered user. Returns a fresh JWT + the canonical user
   * payload. Throws ZodError on invalid input or InvalidCredentialsError if
   * the email is unknown or the password does not match.
   */
  async login(input: unknown): Promise<AuthSuccess> {
    const parsed = LoginRequestSchema.parse(input);
    const email = parsed.email.toLowerCase();

    const record = await this.options.repository.findByEmail(email);
    if (!record) {
      throw new InvalidCredentialsError();
    }

    const ok = await compare(parsed.password, record.passwordHash);
    if (!ok) {
      throw new InvalidCredentialsError();
    }

    const publicUser = this.options.repository.toPublic(record);
    return this.issueSession(publicUser);
  }

  /**
   * Consume an email-verification token. Marks the user verified and burns the
   * token so it cannot be reused. Throws InvalidVerificationTokenError on
   * expired / unknown / already-used tokens.
   */
  async verifyEmail(input: unknown): Promise<VerifyEmailSuccess> {
    const parsed = VerifyEmailRequestSchema.parse(input);
    const now = new Date();

    const verification = await this.options.repository.findActiveVerification(parsed.token, now);
    if (!verification) {
      throw new InvalidVerificationTokenError();
    }

    const updatedRow = await this.options.repository.markEmailVerified(verification.userId, now);
    await this.options.repository.consumeVerification(verification.id, now);
    return { user: this.options.repository.toPublic(updatedRow) };
  }

  /**
   * Issue a fresh verification token for an existing user and re-dispatch the
   * email. Throws AlreadyVerifiedError if the user is already verified;
   * UserNotFoundError if the email is not registered (the API maps that to a
   * 200 to avoid leaking which addresses are on file).
   */
  async resendVerification(input: unknown): Promise<ResendVerificationSuccess> {
    const parsed = ResendVerificationRequestSchema.parse(input);
    const email = parsed.email.toLowerCase();

    const existing = await this.options.repository.findByEmail(email);
    if (!existing) {
      throw new UserNotFoundError();
    }
    if (existing.emailVerifiedAt) {
      throw new AlreadyVerifiedError();
    }

    const publicUser = this.options.repository.toPublic(existing);
    const verification = await this.issueVerification(publicUser);
    return { verification };
  }

  private async issueVerification(user: PublicUser) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + (this.options.verificationTtlMs ?? DEFAULT_VERIFICATION_TTL_MS),
    );
    await this.options.repository.createVerification({
      userId: user.id,
      token,
      expiresAt,
    });
    const verificationUrl = `${this.options.publicBaseUrl.replace(/\/+$/, '')}/verify-email?token=${token}`;

    await this.options.notifications.sendEmailVerification({
      user_id: user.id,
      recipient: user.email,
      verification_token: token,
      verification_url: verificationUrl,
      expires_at: expiresAt.toISOString(),
    });

    return {
      expires_at: expiresAt.toISOString(),
      ...(this.options.exposeVerificationToken ? { token } : {}),
    };
  }

  private issueSession(user: PublicUser): AuthSuccess {
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      this.options.jwtSecret,
      { expiresIn: this.options.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
    );
    return { token, user };
  }
}
