import type { EmailMessage, EmailProvider } from './types.js';

export interface SendGridProviderOptions {
  /** SendGrid API key (SG.xxx); read from env at server bootstrap. */
  apiKey: string;
  /** Verified `From` identity. SendGrid rejects sends from non-verified senders. */
  fromAddress: string;
}

interface SendGridClient {
  setApiKey: (key: string) => void;
  send: (msg: unknown) => Promise<unknown>;
}

/**
 * SendGrid provider. The @sendgrid/mail package is a peer / optional
 * dependency — the import is dynamic so the service still installs +
 * boots when a deployment uses LogOnly or SES. If EMAIL_PROVIDER=sendgrid
 * is selected without the SDK installed, send() throws a descriptive
 * error pointing at the missing package.
 */
export class SendGridProvider implements EmailProvider {
  readonly name = 'sendgrid';
  private clientPromise: Promise<SendGridClient> | null = null;

  constructor(private readonly options: SendGridProviderOptions) {}

  async send(message: EmailMessage): Promise<void> {
    const client = await this.getClient();
    const from = message.from ?? this.options.fromAddress;
    await client.send({
      to: message.to,
      from,
      subject: message.subject,
      text: message.body,
      customArgs: {
        ...(message.templateSlug ? { template: message.templateSlug } : {}),
        ...(message.eventId ? { event_id: message.eventId } : {}),
      },
    });
  }

  private async getClient(): Promise<SendGridClient> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        let mod: typeof import('@sendgrid/mail');
        try {
          mod = await import('@sendgrid/mail');
        } catch {
          throw new Error(
            '@sendgrid/mail is not installed; add it to notification-service dependencies to use the SendGrid provider',
          );
        }
        const client = mod.default as unknown as SendGridClient;
        client.setApiKey(this.options.apiKey);
        return client;
      })();
    }
    return this.clientPromise;
  }
}
