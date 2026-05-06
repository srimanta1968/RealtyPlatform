import { desc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from '@kiana/db-kit';

import {
  leadTimelineEvents,
  type LeadTimelineEventRow,
} from '../../db/schema.js';

export interface AppendTimelineInput {
  leadId: string;
  /** Matches the EventEnvelope event_type — 'lead.created', 'lead.stage_changed', etc. */
  type: string;
  payload?: unknown;
  actorId?: string | null;
}

export interface TimelineRepository {
  append(input: AppendTimelineInput): Promise<LeadTimelineEventRow>;
  listForLead(leadId: string): Promise<LeadTimelineEventRow[]>;
}

type Db = NodePgDatabase<{ leadTimelineEvents: typeof leadTimelineEvents }>;

/**
 * Build a Drizzle-backed timeline repository against lead_db. Append-only
 * by convention — only `append()` and `listForLead()` are exposed. Backs
 * the EventPublisher's durable side-channel; the in-process bus / Redis
 * Streams adapter (Phase 1 Task #13) will read from this same table when
 * it goes live so we never lose an event mid-flight.
 */
export function createTimelineRepository(db: Db): TimelineRepository {
  return {
    async append({ leadId, type, payload, actorId }) {
      const [row] = await db
        .insert(leadTimelineEvents)
        .values({
          leadId,
          type,
          payload: (payload ?? {}) as never,
          actorId: actorId ?? null,
        })
        .returning();
      if (!row) {
        throw new Error('Failed to append lead_timeline_events row — no row returned');
      }
      return row;
    },

    async listForLead(leadId) {
      return db
        .select()
        .from(leadTimelineEvents)
        .where(eq(leadTimelineEvents.leadId, leadId))
        .orderBy(desc(leadTimelineEvents.occurredAt));
    },
  };
}
