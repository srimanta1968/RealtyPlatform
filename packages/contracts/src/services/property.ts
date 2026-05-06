import { z } from 'zod';

import type { PropertyId } from '../primitives/ids.js';

/**
 * Property type enum aligned with Phase-1-Trust-Launch.md §5 + the lifestyle
 * filters in §7 (Villas / Land / Retreats / Investments). `apartment` and
 * `farmhouse` carried over from the prototype catalog so existing filter UI
 * still resolves; the canonical Phase-1 categories are villa / land /
 * retreat / investment.
 */
export const PropertyTypeSchema = z.enum([
  'villa',
  'land',
  'retreat',
  'investment',
  'apartment',
  'farmhouse',
]);
export type PropertyType = z.infer<typeof PropertyTypeSchema>;

/**
 * Publication state machine (Phase-1-Trust-Launch.md §5). DRAFT → PUBLISHED
 * is the standard flow; HOLD / SOLD are post-publish terminals admins can
 * flip into when a property comes off the market.
 */
export const PropertyStatusSchema = z.enum(['draft', 'published', 'hold', 'sold']);
export type PropertyStatus = z.infer<typeof PropertyStatusSchema>;

/**
 * Media attached to a property. Phase 1 stores these as jsonb so we can
 * extend with thumbnails / dimensions / signed-url metadata without another
 * migration. `kind` distinguishes images from the brochure download.
 */
export const PropertyMediaRefSchema = z.object({
  url: z.string().url(),
  kind: z.enum(['image', 'brochure', 'video', 'floorplan']),
  alt: z.string().max(200).optional(),
});
export type PropertyMediaRef = z.infer<typeof PropertyMediaRefSchema>;

export const PropertyCreateRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case ASCII')
    .min(1)
    .max(200),
  type: PropertyTypeSchema,
  location: z.string().trim().min(1).max(200),
  price_min_minor: z.number().int().nonnegative().optional(),
  price_max_minor: z.number().int().nonnegative().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).default([]),
  media: z.array(PropertyMediaRefSchema).default([]),
});
export type PropertyCreateRequest = z.infer<typeof PropertyCreateRequestSchema>;

export interface PropertyRecord {
  id: PropertyId;
  slug: string;
  title: string;
  type: PropertyType;
  location: string;
  status: PropertyStatus;
  price_min_minor: number | null;
  price_max_minor: number | null;
  tags: string[];
  media: PropertyMediaRef[];
  created_at: string;
  updated_at: string;
}
