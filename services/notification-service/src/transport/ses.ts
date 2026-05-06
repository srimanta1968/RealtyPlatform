import type { EmailMessage, EmailProvider } from './types.js';

export interface AwsSesProviderOptions {
  /** AWS region the SES verified-identity lives in (e.g. 'ap-south-1'). */
  region: string;
  /** Verified `From` identity. SES rejects sends from non-verified senders. */
  fromAddress: string;
  /** Optional SES configuration set — wires open/click/bounce events through. */
  configurationSet?: string;
}

interface SesClientBundle {
  client: { send: (cmd: unknown) => Promise<unknown> };
  SendEmailCommand: new (input: unknown) => unknown;
}

/**
 * AWS SES provider. The @aws-sdk/client-ses package is a peer / optional
 * dependency — the import is dynamic so the service still installs +
 * boots when a deployment uses LogOnly or SendGrid. If EMAIL_PROVIDER=ses
 * is selected without the SDK installed, send() throws a descriptive
 * error pointing at the missing package.
 */
export class AwsSesProvider implements EmailProvider {
  readonly name = 'ses';
  private clientPromise: Promise<SesClientBundle> | null = null;

  constructor(private readonly options: AwsSesProviderOptions) {}

  async send(message: EmailMessage): Promise<void> {
    const { client, SendEmailCommand } = await this.getClient();
    const from = message.from ?? this.options.fromAddress;
    const cmdInput: Record<string, unknown> = {
      Source: from,
      Destination: { ToAddresses: [message.to] },
      Message: {
        Subject: { Data: message.subject, Charset: 'UTF-8' },
        Body: { Text: { Data: message.body, Charset: 'UTF-8' } },
      },
      Tags: [
        ...(message.templateSlug ? [{ Name: 'template', Value: message.templateSlug }] : []),
        ...(message.eventId ? [{ Name: 'event_id', Value: message.eventId }] : []),
      ],
    };
    if (this.options.configurationSet) {
      cmdInput.ConfigurationSetName = this.options.configurationSet;
    }
    await client.send(new SendEmailCommand(cmdInput));
  }

  private async getClient(): Promise<SesClientBundle> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        let mod: typeof import('@aws-sdk/client-ses');
        try {
          mod = await import('@aws-sdk/client-ses');
        } catch {
          throw new Error(
            '@aws-sdk/client-ses is not installed; add it to notification-service dependencies to use the SES provider',
          );
        }
        const client = new mod.SESClient({ region: this.options.region }) as unknown as {
          send: (cmd: unknown) => Promise<unknown>;
        };
        return {
          client,
          SendEmailCommand: mod.SendEmailCommand as unknown as new (input: unknown) => unknown,
        };
      })();
    }
    return this.clientPromise;
  }
}
