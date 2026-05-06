import type { Logger } from '@kiana/service-kit';
import {
  SendEmailVerificationRequestSchema,
  type NotificationSendResult,
  type SendEmailVerificationRequest,
} from '@kiana/contracts';

import type { NotificationRepository } from '../infra/notificationRepository.js';

export interface EmailDomainOptions {
  repository: NotificationRepository;
  logger: Logger;
  /** When false, a real SMTP transport would be used. Phase 1 uses log-only. */
  logOnly?: boolean;
}

export const EMAIL_VERIFICATION_TEMPLATE_SLUG = 'auth.email-verification';

export class EmailDomain {
  constructor(private readonly options: EmailDomainOptions) {}

  /**
   * Validate a verification-email send request, persist a notification_sends
   * record, and (in Phase 1 dev) log the verification URL to stdout. Returns
   * the persisted send id + status so callers can correlate.
   */
  async sendEmailVerification(input: unknown): Promise<NotificationSendResult> {
    const parsed = SendEmailVerificationRequestSchema.parse(input);
    const useLogTransport = this.options.logOnly ?? true;

    const status: NotificationSendResult['status'] = useLogTransport ? 'logged' : 'sent';

    const sendRow = await this.options.repository.recordSend({
      templateSlug: EMAIL_VERIFICATION_TEMPLATE_SLUG,
      recipient: parsed.recipient,
      channel: 'email',
      status,
      payload: {
        user_id: parsed.user_id,
        verification_url: parsed.verification_url,
        expires_at: parsed.expires_at,
      },
      sentAt: new Date(),
    });

    if (useLogTransport) {
      // Log a developer-friendly link so the registration flow is testable
      // without an SMTP server. In production this branch is replaced with
      // a real transport (Nodemailer / SES / SendGrid).
      this.options.logger.info(
        {
          send_id: sendRow.id,
          recipient: parsed.recipient,
          verification_url: parsed.verification_url,
        },
        '[email-verification] (logged) — would send verification email in production',
      );
    }

    return {
      send_id: sendRow.id,
      status,
      channel: 'email',
      recipient: parsed.recipient,
    };
  }
}
