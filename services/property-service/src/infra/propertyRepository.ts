import { and, eq, gte, ilike, lte, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from '@kiana/db-kit';

import {
  asPropertyId,
  type PropertyMediaRef,
  type PropertyRecord,
  type PropertyStatus,
  type PropertyType,
} from '@kiana/contracts';

import { properties, type PropertyInsert, type PropertyRow } from '../../db/schema.js';

export interface PropertyRepository {
  insert(values: PropertyInsert): Promise<PropertyRecord>;
  findById(id: string): Promise<PropertyRecord | null>;
  findBySlug(slug: string): Promise<PropertyRecord | null>;
  list(filter: PropertyListFilter): Promise<PropertyRecord[]>;
  updateFields(id: string, fields: PropertyFieldUpdate): Promise<PropertyRecord | null>;
}

export interface PropertyListFilter {
  status?: PropertyStatus;
  type?: PropertyType;
  location?: string;
  priceMinMinor?: number;
  priceMaxMinor?: number;
}

export interface PropertyFieldUpdate {
  title?: string;
  type?: PropertyType;
  location?: string;
  status?: PropertyStatus;
  priceMinMinor?: number | null;
  priceMaxMinor?: number | null;
  tags?: string[];
  media?: PropertyMediaRef[];
}

type Db = NodePgDatabase<{ properties: typeof properties }>;

function toRecord(row: PropertyRow): PropertyRecord {
  return {
    id: asPropertyId(row.id),
    slug: row.slug,
    title: row.title,
    type: row.type as PropertyType,
    location: row.location,
    status: row.status as PropertyStatus,
    price_min_minor: row.priceMinMinor,
    price_max_minor: row.priceMaxMinor,
    tags: (row.tags ?? []) as string[],
    media: (row.media ?? []) as PropertyMediaRef[],
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

/** Build a Drizzle-backed property repository against the property_db handle. */
export function createPropertyRepository(db: Db): PropertyRepository {
  return {
    async insert(values) {
      const [row] = await db.insert(properties).values(values).returning();
      if (!row) {
        throw new Error('Failed to insert property — no row returned');
      }
      return toRecord(row);
    },

    async findById(id) {
      const [row] = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
      return row ? toRecord(row) : null;
    },

    async findBySlug(slug) {
      const [row] = await db.select().from(properties).where(eq(properties.slug, slug)).limit(1);
      return row ? toRecord(row) : null;
    },

    async list(filter) {
      const conditions: SQL[] = [];
      if (filter.status) conditions.push(eq(properties.status, filter.status));
      if (filter.type) conditions.push(eq(properties.type, filter.type));
      if (filter.location) conditions.push(ilike(properties.location, `%${filter.location}%`));
      if (filter.priceMinMinor !== undefined) {
        conditions.push(gte(properties.priceMinMinor, filter.priceMinMinor));
      }
      if (filter.priceMaxMinor !== undefined) {
        conditions.push(lte(properties.priceMaxMinor, filter.priceMaxMinor));
      }
      const where = conditions.length === 0 ? undefined : and(...conditions);
      const rows = await db
        .select()
        .from(properties)
        .where(where)
        .orderBy(properties.updatedAt);
      return rows.map(toRecord);
    },

    async updateFields(id, fields) {
      const set: Record<string, unknown> = { updatedAt: new Date() };
      if (fields.title !== undefined) set.title = fields.title;
      if (fields.type !== undefined) set.type = fields.type;
      if (fields.location !== undefined) set.location = fields.location;
      if (fields.status !== undefined) set.status = fields.status;
      if (fields.priceMinMinor !== undefined) set.priceMinMinor = fields.priceMinMinor;
      if (fields.priceMaxMinor !== undefined) set.priceMaxMinor = fields.priceMaxMinor;
      if (fields.tags !== undefined) set.tags = fields.tags;
      if (fields.media !== undefined) set.media = fields.media;
      const [row] = await db
        .update(properties)
        .set(set)
        .where(eq(properties.id, id))
        .returning();
      return row ? toRecord(row) : null;
    },
  };
}
