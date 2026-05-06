import { z } from 'zod';

export const NotificationChannelSchema = z.enum(['email', 'sms', 'whatsapp', 'push']);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

/**
 * Payload accepted by the notification-service internal email-verification
 * endpoint. The user-service posts here when it issues a verification token.
 */
export const SendEmailVerificationRequestSchema = z.object({
  user_id: z.string().uuid(),
  recipient: z.string().trim().email(),
  verification_token: z.string().min(20),
  verification_url: z.string().url(),
  expires_at: z.string().datetime(),
});
export type SendEmailVerificationRequest = z.infer<typeof SendEmailVerificationRequestSchema>;

export interface NotificationSendResult {
  send_id: string;
  status: 'queued' | 'logged' | 'sent' | 'failed';
  channel: NotificationChannel;
  recipient: string;
}
