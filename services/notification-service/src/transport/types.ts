/**
 * Outbound transport contract every notification dispatcher writes against.
 * Phase-1 implementations: LogOnly (default, dev), AwsSes, SendGrid. The
 * shape stays minimal — dispatch one templated email to one recipient,
 * return on transport-acceptance, throw on failure. Multi-recipient,
 * attachments, and templated-on-the-vendor-side helpers can land later
 * without breaking the contract.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  /** Optional sender override; transport uses its configured default when omitted. */
  from?: string;
  /** Phase-1 audit-trail metadata threaded into provider-side tags / log lines. */
  templateSlug?: string;
  eventId?: string;
}

export interface EmailProvider {
  /** Stable identifier for ops/diag output ('logonly', 'ses', 'sendgrid'). */
  readonly name: string;
  /**
   * Dispatch the message to the underlying transport. Resolves once the
   * transport has accepted hand-off; rejects with a descriptive error
   * when the transport refuses (caller maps onto notification_sends
   * status='failed' + error column).
   */
  send(message: EmailMessage): Promise<void>;
}
