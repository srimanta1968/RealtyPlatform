import type { LeadStageChanged } from '@kiana/contracts';
import type { Logger } from '@kiana/service-kit';

import type { NotificationRepository } from '../infra/notificationRepository.js';
import type { LeadLookupRepository } from '../infra/leadLookupRepository.js';
import { TemplateDomain, TemplateNotFoundError } from './templates.js';
import { renderTemplate, type RenderContext } from './render.js';

const STAGE_CHANGED_TEMPLATE_SLUG = 'stage_changed';

export interface LeadStageChangedSubscriberOptions {
  repository: NotificationRepository;
  templateDomain: TemplateDomain;
  leadLookup: LeadLookupRepository;
  logger: Logger;
  /** When true, dispatch is log-only (Phase-1 default). */
  logOnly?: boolean;
}

export interface LeadStageChangedHandleResult {
  send_id: string | null;
  /** True when no notification_sends row was written (lead not found / no email). */
  skipped: boolean;
}

/**
 * Consumes lead.stage_changed envelope events and dispatches the canonical
 * stage_changed customer email. The envelope payload only carries lead_id +
 * from_stage + to_stage; the lead's full_name / email are looked up against
 * the shared leads table at dispatch time so subscribers stay decoupled from
 * the lead-service contract changes.
 *
 * notification_sends is written with status='dispatched' on success and
 * status='failed' (with error column populated) when the transport raises.
 * No row is written when the lead row is gone (deleted between event and
 * delivery) or when the lead carries no email — both branches log + skip.
 */
export class LeadStageChangedSubscriber {
  constructor(private readonly options: LeadStageChangedSubscriberOptions) {}

  async handle(envelope: LeadStageChanged): Promise<LeadStageChangedHandleResult> {
    const { payload, event_id } = envelope;
    const { repository, templateDomain, leadLookup, logger, logOnly = true } = this.options;

    const lead = await leadLookup.findById(payload.lead_id);
    if (!lead) {
      logger.warn(
        { event_id, lead_id: payload.lead_id },
        '[lead.stage_changed] lead row not found at dispatch time — skipping',
      );
      return { send_id: null, skipped: true };
    }
    if (!lead.email) {
      logger.info(
        { event_id, lead_id: payload.lead_id },
        '[lead.stage_changed] customer email skipped — lead has no email address',
      );
      return { send_id: null, skipped: true };
    }

    const context: RenderContext = {
      full_name: lead.full_name,
      from_stage: payload.from_stage,
      to_stage: payload.to_stage,
    };

    try {
      const template = await templateDomain.getBySlug(STAGE_CHANGED_TEMPLATE_SLUG);
      const rendered = renderTemplate(template, context);

      if (logOnly) {
        logger.info(
          {
            event_id,
            slug: STAGE_CHANGED_TEMPLATE_SLUG,
            recipient: lead.email,
            subject: rendered.subject,
          },
          `[lead.stage_changed] (logged) — would dispatch ${STAGE_CHANGED_TEMPLATE_SLUG}`,
        );
      }

      const row = await repository.recordSend({
        templateSlug: STAGE_CHANGED_TEMPLATE_SLUG,
        recipient: lead.email,
        channel: 'email',
        status: 'dispatched',
        payload: {
          event_id,
          subject: rendered.subject,
          body: rendered.body,
          ...context,
        },
        sentAt: new Date(),
      });
      return { send_id: row.id, skipped: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown dispatch error';
      logger.error(
        { err, event_id, slug: STAGE_CHANGED_TEMPLATE_SLUG, recipient: lead.email },
        '[lead.stage_changed] failed to dispatch',
      );
      const failedRow = await repository.recordSend({
        templateSlug: STAGE_CHANGED_TEMPLATE_SLUG,
        recipient: lead.email,
        channel: 'email',
        status: 'failed',
        payload: { event_id, ...context },
        error:
          err instanceof TemplateNotFoundError
            ? `Template '${STAGE_CHANGED_TEMPLATE_SLUG}' not registered`
            : message,
        sentAt: new Date(),
      });
      return { send_id: failedRow.id, skipped: false };
    }
  }
}
