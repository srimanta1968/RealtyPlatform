import { createServiceClient, type ServiceClient } from '@kiana/service-client';
import type { Logger } from '@kiana/service-kit';
import type { SendEmailVerificationRequest } from '@kiana/contracts';

export interface NotificationDispatcher {
  sendEmailVerification(input: SendEmailVerificationRequest): Promise<void>;
}

export interface NotificationDispatcherOptions {
  baseUrl: string;
  serviceToken: string;
  logger: Logger;
}

/**
 * Posts notification requests to notification-service. Failures are logged
 * but never block the calling user-service flow — registration must still
 * succeed even if the notification side is down (the user can re-trigger
 * via /api/auth/resend-verification once it recovers).
 */
export function createNotificationDispatcher(
  options: NotificationDispatcherOptions,
): NotificationDispatcher {
  const client: ServiceClient = createServiceClient({
    baseUrl: options.baseUrl,
    serviceToken: options.serviceToken,
  });

  return {
    async sendEmailVerification(input) {
      try {
        await client.post('/internal/notifications/email-verification', input);
      } catch (err) {
        options.logger.warn(
          { err, recipient: input.recipient },
          'Failed to dispatch email-verification notification — register flow continues',
        );
      }
    },
  };
}
