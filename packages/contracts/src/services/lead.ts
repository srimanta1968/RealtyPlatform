import { z } from 'zod';

import type { LeadStage } from '../enums/index.js';
import type { LeadId, UserId } from '../primitives/ids.js';

export const LeadSourceSchema = z.enum([
  'web_form',
  'whatsapp',
  'phone',
  'referral',
  'walk_in',
  'campaign',
  'broker',
  'import',
]);
export type LeadSource = z.infer<typeof LeadSourceSchema>;

export const LeadCreateRequestSchema = z.object({
  full_name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(20).optional(),
  source: LeadSourceSchema,
  budget_min_minor: z.number().int().nonnegative().optional(),
  budget_max_minor: z.number().int().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
});
export type LeadCreateRequest = z.infer<typeof LeadCreateRequestSchema>;

export interface LeadRecord {
  id: LeadId;
  owner_id: UserId | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  stage: LeadStage;
  budget_min_minor: number | null;
  budget_max_minor: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
