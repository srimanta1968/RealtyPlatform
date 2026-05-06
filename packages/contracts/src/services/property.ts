import { z } from 'zod';

import type { PropertyId } from '../primitives/ids.js';

export const PropertyTypeSchema = z.enum([
  'villa',
  'apartment',
  'plot',
  'townhouse',
  'penthouse',
  'farmhouse',
]);
export type PropertyType = z.infer<typeof PropertyTypeSchema>;

export const PropertyCreateRequestSchema = z.object({
  title: z.string().min(1).max(200),
  type: PropertyTypeSchema,
  city: z.string().min(1).max(100),
  locality: z.string().min(1).max(100),
  bedrooms: z.number().int().nonnegative().max(20),
  carpet_area_sqft: z.number().int().positive(),
  list_price_minor: z.number().int().positive(),
});
export type PropertyCreateRequest = z.infer<typeof PropertyCreateRequestSchema>;

export interface PropertyRecord {
  id: PropertyId;
  title: string;
  type: PropertyType;
  city: string;
  locality: string;
  bedrooms: number;
  carpet_area_sqft: number;
  list_price_minor: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}
