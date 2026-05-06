import { z } from 'zod';

export const NotificationChannelSchema = z.enum(['email', 'sms', 'whatsapp', 'push']);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

/**
 * Phase-1 canonical template slugs (Phase-1-Trust-Launch.md §4 Notification
 * Service). The seed migrations in services/notification-service/db/bootstrap.ts
 * always insert these four rows so subscribers can render against a known
 * template registry from day one.
 */
export const NotificationTemplateSlugSchema = z.enum([
  'verification',
  'lead_created_customer',
  'lead_created_presales',
  'stage_changed',
]);
export type NotificationTemplateSlug = z.infer<typeof NotificationTemplateSlugSchema>;

/**
 * Admin upsert for a notification template. `slug` is the unique key — the
 * upsert pattern lets ops tune the body / subject without a redeploy. Body
 * uses {{handlebars}}-style placeholders; consumers call render(template,
 * payload) at dispatch time.
 */
export const NotificationTemplateUpsertRequestSchema = z.object({
  slug: z.string().trim().min(1).max(100),
  channel: NotificationChannelSchema,
  subject: z.string().max(200).optional().nullable(),
  body: z.string().min(1),
});
export type NotificationTemplateUpsertRequest = z.infer<
  typeof NotificationTemplateUpsertRequestSchema
>;

export interface NotificationTemplate {
  id: string;
  slug: string;
  channel: NotificationChannel;
  subject: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

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
  status: 'queued' | 'logged' | 'sent' | 'dispatched' | 'failed';
  channel: NotificationChannel;
  recipient: string;
}
