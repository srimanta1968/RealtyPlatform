import {
  NotificationTemplateUpsertRequestSchema,
  type NotificationTemplate,
} from '@kiana/contracts';

import type { NotificationRepository } from '../infra/notificationRepository.js';

export class TemplateNotFoundError extends Error {
  constructor(slug: string) {
    super(`Notification template '${slug}' is not registered.`);
    this.name = 'TemplateNotFoundError';
  }
}

export interface TemplateDomainOptions {
  repository: NotificationRepository;
}

/**
 * Admin-facing notification-template registry. Phase-1 only handles the
 * four canonical templates seeded in db/bootstrap.ts (verification,
 * lead_created_customer, lead_created_presales, stage_changed); this
 * class is the gateway operators use to tune subject / body copy without
 * a redeploy. Authentication / role gating happens at the route layer
 * (admin-only) — domain trusts the caller.
 */
export class TemplateDomain {
  constructor(private readonly options: TemplateDomainOptions) {}

  /** Validate + upsert. Returns the canonical row (idempotent). */
  async upsert(input: unknown): Promise<NotificationTemplate> {
    const parsed = NotificationTemplateUpsertRequestSchema.parse(input);
    return this.options.repository.upsertTemplate(parsed);
  }

  /** Resolve a template by slug; throws when not registered. */
  async getBySlug(slug: string): Promise<NotificationTemplate> {
    const template = await this.options.repository.findTemplateBySlug(slug);
    if (!template) throw new TemplateNotFoundError(slug);
    return template;
  }

  /** List every registered template — used by the admin UI. */
  async list(): Promise<NotificationTemplate[]> {
    return this.options.repository.listTemplates();
  }
}
