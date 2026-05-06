import { z } from 'zod';

import type { LeadId, UserId, WorkflowId } from '../primitives/ids.js';

export const WorkflowKindSchema = z.enum([
  'lead_nurture',
  'visit_lifecycle',
  'drip_campaign',
  'recovery',
]);
export type WorkflowKind = z.infer<typeof WorkflowKindSchema>;

export const WorkflowStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'cancelled',
  'failed',
]);
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;

export const WorkflowCreateRequestSchema = z.object({
  kind: WorkflowKindSchema,
  lead_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type WorkflowCreateRequest = z.infer<typeof WorkflowCreateRequestSchema>;

export interface WorkflowRecord {
  id: WorkflowId;
  kind: WorkflowKind;
  lead_id: LeadId | null;
  status: WorkflowStatus;
  owner_id: UserId | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
