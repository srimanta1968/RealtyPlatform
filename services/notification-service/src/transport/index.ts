import type { Logger } from '@kiana/service-kit';

import { AwsSesProvider } from './ses.js';
import { LogOnlyEmailProvider } from './logOnly.js';
import { SendGridProvider } from './sendgrid.js';
import type { EmailProvider } from './types.js';

export type { EmailMessage, EmailProvider } from './types.js';
export { AwsSesProvider } from './ses.js';
export { LogOnlyEmailProvider } from './logOnly.js';
export { SendGridProvider } from './sendgrid.js';

export type EmailProviderName = 'logonly' | 'ses' | 'sendgrid';

const KNOWN_PROVIDERS: readonly EmailProviderName[] = ['logonly', 'ses', 'sendgrid'];

export interface CreateEmailProviderOptions {
  /** EMAIL_PROVIDER from the environment; defaults to 'logonly' for dev. */
  provider?: string;
  logger: Logger;
  /** Default `From` identity used when a message doesn't override it. */
  fromAddress?: string;
  /** AWS region for the SES provider. */
  awsRegion?: string;
  /** Optional SES configuration set name. */
  awsConfigurationSet?: string;
  /** SendGrid API key (required when provider='sendgrid'). */
  sendgridApiKey?: string;
}

const DEFAULT_FROM = 'no-reply@kiana.local';
const DEFAULT_AWS_REGION = 'ap-south-1';

/**
 * Build the configured EmailProvider from environment values. Unknown
 * provider strings fall back to LogOnly so a typo never silently swallows
 * production mail — the logger captures the rejection at boot.
 */
export function createEmailProvider(options: CreateEmailProviderOptions): EmailProvider {
  const requested = (options.provider ?? 'logonly').toLowerCase();
  const fromAddress = options.fromAddress ?? DEFAULT_FROM;

  if (!KNOWN_PROVIDERS.includes(requested as EmailProviderName)) {
    options.logger.warn(
      { requested, knownProviders: KNOWN_PROVIDERS },
      `[email] unknown EMAIL_PROVIDER='${requested}' — falling back to logonly`,
    );
    return new LogOnlyEmailProvider(options.logger);
  }

  switch (requested as EmailProviderName) {
    case 'logonly':
      return new LogOnlyEmailProvider(options.logger);
    case 'ses':
      return new AwsSesProvider({
        region: options.awsRegion ?? DEFAULT_AWS_REGION,
        fromAddress,
        configurationSet: options.awsConfigurationSet,
      });
    case 'sendgrid':
      if (!options.sendgridApiKey) {
        options.logger.error(
          '[email] EMAIL_PROVIDER=sendgrid but SENDGRID_API_KEY is empty — falling back to logonly',
        );
        return new LogOnlyEmailProvider(options.logger);
      }
      return new SendGridProvider({
        apiKey: options.sendgridApiKey,
        fromAddress,
      });
  }
}
