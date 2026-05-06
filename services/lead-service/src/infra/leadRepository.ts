import { and, eq, lt, notInArray, sql } from 'drizzle-orm';
import type { NodePgDatabase } from '@kiana/db-kit';

import {
  asLeadId,
  asUserId,
  type LeadRecord,
  type LeadSource,
  type LeadSourceCount,
  type LeadStage,
  type LeadStageCount,
} from '@kiana/contracts';

import { leads, type LeadInsert, type LeadRow } from '../../db/schema.js';

export interface LeadFieldUpdate {
  stage?: LeadStage;
  /** notes can be set to null explicitly to clear it. */
  notes?: string | null;
}

export interface LeadRepository {
  insert(values: LeadInsert): Promise<LeadRecord>;
  findById(id: string): Promise<LeadRecord | null>;
  list(): Promise<LeadRecord[]>;
  findStale(olderThan: Date, excludeStages: LeadStage[]): Promise<LeadRecord[]>;
  countBySource(): Promise<LeadSourceCount[]>;
  countByStage(): Promise<LeadStageCount[]>;
  updateFields(id: string, fields: LeadFieldUpdate): Promise<LeadRecord | null>;
}

type Db = NodePgDatabase<{ leads: typeof leads }>;

function toRecord(row: LeadRow): LeadRecord {
  return {
    id: asLeadId(row.id),
    owner_id: row.ownerId ? asUserId(row.ownerId) : null,
    full_name: row.fullName,
    email: row.email,
    phone: row.phone,
    source: row.source as LeadSource,
    stage: row.stage as LeadStage,
    budget_min_minor: row.budgetMinMinor,
    budget_max_minor: row.budgetMaxMinor,
    notes: row.notes,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

/** Build a Drizzle-backed lead repository against the lead_db handle. */
export function createLeadRepository(db: Db): LeadRepository {
  return {
    async insert(values) {
      const [row] = await db.insert(leads).values(values).returning();
      if (!row) {
        throw new Error('Failed to insert lead — no row returned');
      }
      return toRecord(row);
    },

    async findById(id) {
      const [row] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
      return row ? toRecord(row) : null;
    },

    async list() {
      const rows = await db.select().from(leads).orderBy(leads.createdAt);
      return rows.map(toRecord);
    },

    async findStale(olderThan, excludeStages) {
      const where =
        excludeStages.length > 0
          ? and(lt(leads.updatedAt, olderThan), notInArray(leads.stage, excludeStages))
          : lt(leads.updatedAt, olderThan);
      const rows = await db.select().from(leads).where(where).orderBy(leads.updatedAt);
      return rows.map(toRecord);
    },

    async countBySource() {
      const rows = await db
        .select({
          source: leads.source,
          count: sql<number>`count(*)::int`,
        })
        .from(leads)
        .groupBy(leads.source);
      return rows.map((row) => ({
        source: row.source as LeadSource,
        count: Number(row.count),
      }));
    },

    async countByStage() {
      const rows = await db
        .select({
          stage: leads.stage,
          count: sql<number>`count(*)::int`,
        })
        .from(leads)
        .groupBy(leads.stage);
      return rows.map((row) => ({
        stage: row.stage as LeadStage,
        count: Number(row.count),
      }));
    },

    async updateFields(id, fields) {
      const set: Record<string, unknown> = { updatedAt: new Date() };
      if (fields.stage !== undefined) set.stage = fields.stage;
      if (fields.notes !== undefined) set.notes = fields.notes;
      const [row] = await db.update(leads).set(set).where(eq(leads.id, id)).returning();
      return row ? toRecord(row) : null;
    },
  };
}
