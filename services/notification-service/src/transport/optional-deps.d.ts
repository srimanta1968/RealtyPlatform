/**
 * Ambient declarations for the optional email-provider SDKs. These
 * packages are NOT in notification-service/package.json — deployments
 * that select EMAIL_PROVIDER=ses or EMAIL_PROVIDER=sendgrid install the
 * matching SDK separately. Declaring them here as `any` lets the
 * dynamic-import sites in transport/ses.ts and transport/sendgrid.ts
 * type-check without forcing the deps on every install.
 */
declare module '@aws-sdk/client-ses' {
  export class SESClient {
    constructor(options?: { region?: string });
    send(command: unknown): Promise<unknown>;
  }
  export class SendEmailCommand {
    constructor(input: unknown);
  }
}

declare module '@sendgrid/mail' {
  interface SendGridMail {
    setApiKey(key: string): void;
    send(message: unknown): Promise<unknown>;
  }
  const mail: SendGridMail;
  export default mail;
}
