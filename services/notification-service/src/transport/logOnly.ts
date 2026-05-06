import type { Logger } from '@kiana/service-kit';

import type { EmailMessage, EmailProvider } from './types.js';

/**
 * Dev / Phase-1 default. Logs the would-have-been email at info level
 * instead of dispatching to a real SMTP / API transport. Subscribers
 * still record a notification_sends row with status='dispatched' so
 * the audit trail is identical to a production run.
 */
export class LogOnlyEmailProvider implements EmailProvider {
  readonly name = 'logonly';

  constructor(private readonly logger: Logger) {}

  async send(message: EmailMessage): Promise<void> {
    this.logger.info(
      {
        to: message.to,
        from: message.from,
        subject: message.subject,
        templateSlug: message.templateSlug,
        event_id: message.eventId,
      },
      '[email/logonly] (logged) — would dispatch in production',
    );
  }
}
