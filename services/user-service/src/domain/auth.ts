import { compare, hash } from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { RegisterRequestSchema, type AuthSuccess, type PublicUser } from '@kiana/contracts';
import { asUserId } from '@kiana/contracts';

import type { UserRepository } from '../infra/userRepository.js';

export class EmailTakenError extends Error {
  constructor() {
    super('An account with this email already exists.');
    this.name = 'EmailTakenError';
  }
}

export interface AuthDomainOptions {
  repository: UserRepository;
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
}

export class AuthDomain {
  constructor(private readonly options: AuthDomainOptions) {}

  /**
   * Validate and persist a new user, returning a signed JWT plus the
   * canonical public user payload. Throws ZodError on bad input or
   * EmailTakenError on duplicate email.
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
    return this.issueSession(user);
  }

  /** Verify password against the stored bcrypt hash. */
  async verifyCredentials(email: string, password: string): Promise<PublicUser | null> {
    const record = await this.options.repository.findByEmail(email.toLowerCase());
    if (!record) return null;
    const ok = await compare(password, record.passwordHash);
    if (!ok) return null;
    return this.toPublic(record);
  }

  private issueSession(user: PublicUser): AuthSuccess {
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      this.options.jwtSecret,
      { expiresIn: this.options.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
    );
    return { token, user };
  }

  private toPublic(row: { id: string; email: string; createdAt: Date }): PublicUser {
    return {
      id: asUserId(row.id),
      email: row.email,
      created_at: row.createdAt.toISOString(),
    };
  }
}
