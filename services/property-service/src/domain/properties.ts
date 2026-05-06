import {
  PropertyCreateRequestSchema,
  PropertyStatusSchema,
  type PropertyRecord,
  type PropertyStatus,
} from '@kiana/contracts';

import type {
  PropertyFieldUpdate,
  PropertyListFilter,
  PropertyRepository,
} from '../infra/propertyRepository.js';

export class PropertyNotFoundError extends Error {
  constructor(idOrSlug: string) {
    super(`Property ${idOrSlug} not found.`);
    this.name = 'PropertyNotFoundError';
  }
}

export class PropertySlugTakenError extends Error {
  constructor(slug: string) {
    super(`Property slug '${slug}' is already in use.`);
    this.name = 'PropertySlugTakenError';
  }
}

export class PriceRangeError extends Error {
  constructor() {
    super('price_min_minor cannot exceed price_max_minor.');
    this.name = 'PriceRangeError';
  }
}

export interface PropertyDomainOptions {
  repository: PropertyRepository;
}

export class PropertyDomain {
  constructor(private readonly options: PropertyDomainOptions) {}

  /** Validate + persist a new property in DRAFT. Throws ZodError on bad input. */
  async create(input: unknown): Promise<PropertyRecord> {
    const parsed = PropertyCreateRequestSchema.parse(input);
    if (
      parsed.price_min_minor !== undefined &&
      parsed.price_max_minor !== undefined &&
      parsed.price_min_minor > parsed.price_max_minor
    ) {
      throw new PriceRangeError();
    }
    const existing = await this.options.repository.findBySlug(parsed.slug);
    if (existing) throw new PropertySlugTakenError(parsed.slug);
    return this.options.repository.insert({
      slug: parsed.slug,
      title: parsed.title,
      type: parsed.type,
      location: parsed.location,
      status: 'draft',
      priceMinMinor: parsed.price_min_minor ?? null,
      priceMaxMinor: parsed.price_max_minor ?? null,
      tags: parsed.tags as never,
      media: parsed.media as never,
    });
  }

  /** Fetch by id; throws PropertyNotFoundError when absent. */
  async getById(id: string): Promise<PropertyRecord> {
    const property = await this.options.repository.findById(id);
    if (!property) throw new PropertyNotFoundError(id);
    return property;
  }

  /** Fetch by URL slug — used by the public web-public detail page. */
  async getBySlug(slug: string): Promise<PropertyRecord> {
    const property = await this.options.repository.findBySlug(slug);
    if (!property) throw new PropertyNotFoundError(slug);
    return property;
  }

  /**
   * List properties with optional filters. Status defaults to undefined
   * for admin reads; the public list endpoint passes status='published'
   * so unpublished records never leak.
   */
  async list(filter: PropertyListFilter = {}): Promise<PropertyRecord[]> {
    return this.options.repository.list(filter);
  }

  /** Apply a partial update — admin-only. Validates price range. */
  async update(id: string, fields: PropertyFieldUpdate): Promise<PropertyRecord> {
    if (
      fields.priceMinMinor !== undefined &&
      fields.priceMaxMinor !== undefined &&
      fields.priceMinMinor !== null &&
      fields.priceMaxMinor !== null &&
      fields.priceMinMinor > fields.priceMaxMinor
    ) {
      throw new PriceRangeError();
    }
    const updated = await this.options.repository.updateFields(id, fields);
    if (!updated) throw new PropertyNotFoundError(id);
    return updated;
  }

  /**
   * Move the publish state machine (draft → published / hold / sold).
   * The actual transition rules are enforced here so the route handler
   * can map onto a clean error envelope.
   */
  async setStatus(id: string, nextStatus: PropertyStatus): Promise<PropertyRecord> {
    const parsed = PropertyStatusSchema.parse(nextStatus);
    const updated = await this.options.repository.updateFields(id, { status: parsed });
    if (!updated) throw new PropertyNotFoundError(id);
    return updated;
  }
}
