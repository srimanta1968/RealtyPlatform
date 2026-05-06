import { eq, sql } from 'drizzle-orm';
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

export interface LeadRepository {
  insert(values: LeadInsert): Promise<LeadRecord>;
  findById(id: string): Promise<LeadRecord | null>;
  list(): Promise<LeadRecord[]>;
  countBySource(): Promise<LeadSourceCount[]>;
  countByStage(): Promise<LeadStageCount[]>;
  updateStage(id: string, stage: LeadStage): Promise<LeadRecord | null>;
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

    async updateStage(id, stage) {
      const [row] = await db
        .update(leads)
        .set({ stage, updatedAt: new Date() })
        .where(eq(leads.id, id))
        .returning();
      return row ? toRecord(row) : null;
    },
  };
}
