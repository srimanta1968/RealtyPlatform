import type { LeadCreated } from '@kiana/contracts';
import type { Logger } from '@kiana/service-kit';

import type { NotificationRepository } from '../infra/notificationRepository.js';
import type { EmailProvider } from '../transport/index.js';
import { TemplateDomain, TemplateNotFoundError } from './templates.js';
import { renderTemplate, type RenderContext } from './render.js';

const CUSTOMER_TEMPLATE_SLUG = 'lead_created_customer';
const PRESALES_TEMPLATE_SLUG = 'lead_created_presales';

export interface LeadCreatedSubscriberOptions {
  repository: NotificationRepository;
  templateDomain: TemplateDomain;
  emailProvider: EmailProvider;
  logger: Logger;
  /** Distribution-list address that receives the presales email. */
  presalesRecipient: string;
  /** Base URL the presales email links back to (lead detail in admin cockpit). */
  leadDetailUrlBase: string;
}

export interface LeadCreatedHandleResult {
  customer_send_id: string | null;
  presales_send_id: string;
}

/**
 * Consumes lead.created envelope events and dispatches the two Phase-1 emails:
 *
 *   1. lead_created_customer  → lead.email (acknowledgement)
 *   2. lead_created_presales  → on-duty presales distribution list
 *
 * Each dispatch attempt records a notification_sends row with
 * status='dispatched' on success and status='failed' (with the error captured)
 * when the transport raises. When the lead has no email address the customer
 * branch is skipped entirely (no row is written, only a log line) — there is
 * no recipient to attempt.
 */
export class LeadCreatedSubscriber {
  constructor(private readonly options: LeadCreatedSubscriberOptions) {}

  async handle(envelope: LeadCreated): Promise<LeadCreatedHandleResult> {
    const { payload, event_id } = envelope;
    const { logger, presalesRecipient, leadDetailUrlBase } = this.options;

    const customerContext: RenderContext = { full_name: payload.full_name };
    const presalesContext: RenderContext = {
      full_name: payload.full_name,
      email: payload.email ?? '(none)',
      phone: payload.phone ?? '(none)',
      stage: payload.stage,
      source: payload.source,
      lead_url: joinUrl(leadDetailUrlBase, payload.lead_id),
    };

    let customerSendId: string | null = null;
    if (payload.email) {
      customerSendId = await this.dispatch({
        slug: CUSTOMER_TEMPLATE_SLUG,
        recipient: payload.email,
        context: customerContext,
        eventId: event_id,
      });
    } else {
      logger.info(
        { event_id, lead_id: payload.lead_id },
        '[lead.created] customer email skipped — lead has no email address',
      );
    }

    const presalesSendId = await this.dispatch({
      slug: PRESALES_TEMPLATE_SLUG,
      recipient: presalesRecipient,
      context: presalesContext,
      eventId: event_id,
    });

    return { customer_send_id: customerSendId, presales_send_id: presalesSendId };
  }

  private async dispatch(args: {
    slug: string;
    recipient: string;
    context: RenderContext;
    eventId: string;
  }): Promise<string> {
    const { slug, recipient, context, eventId } = args;
    const { repository, templateDomain, emailProvider, logger } = this.options;

    try {
      const template = await templateDomain.getBySlug(slug);
      const rendered = renderTemplate(template, context);

      await emailProvider.send({
        to: recipient,
        subject: rendered.subject ?? '',
        body: rendered.body,
        templateSlug: slug,
        eventId,
      });

      const row = await repository.recordSend({
        templateSlug: slug,
        recipient,
        channel: 'email',
        status: 'dispatched',
        payload: {
          event_id: eventId,
          provider: emailProvider.name,
          subject: rendered.subject,
          body: rendered.body,
          ...context,
        },
        sentAt: new Date(),
      });
      return row.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown dispatch error';
      logger.error(
        { err, event_id: eventId, slug, recipient, provider: emailProvider.name },
        `[lead.created] failed to dispatch ${slug}`,
      );
      // For TemplateNotFoundError the template slug is missing from the
      // registry — surface the error column so ops can spot it in the
      // notification_sends audit trail.
      const failedRow = await repository.recordSend({
        templateSlug: slug,
        recipient,
        channel: 'email',
        status: 'failed',
        payload: { event_id: eventId, provider: emailProvider.name, ...context },
        error: err instanceof TemplateNotFoundError ? `Template '${slug}' not registered` : message,
        sentAt: new Date(),
      });
      return failedRow.id;
    }
  }
}

function joinUrl(base: string, leadId: string): string {
  const trimmed = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${trimmed}/${leadId}`;
}
