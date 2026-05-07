import type { PropertyType } from '@kiana/contracts';

/**
 * Lifestyle-category filter rows shared between the server-rendered
 * /properties page (reads them at request time to set the heading) and
 * the client-side <LifestyleFilter /> component (renders the pill row
 * and pushes querystring updates). Lives in a plain non-'use client'
 * module so importing the constant from a Server Component doesn't
 * trigger Next's "client function called from server" guard.
 */
export interface LifestyleFilterRow {
  type: PropertyType | 'all';
  label: string;
  tagline: string;
}

export const LIFESTYLE_FILTERS: LifestyleFilterRow[] = [
  { type: 'all', label: 'All listings', tagline: 'Every property currently on offer' },
  { type: 'villa', label: 'Villas', tagline: 'Move-in ready hilltop & weekend homes' },
  { type: 'land', label: 'Land', tagline: 'Build-your-own plots near Lonavala & Karjat' },
  { type: 'retreat', label: 'Retreats', tagline: 'Boutique resort-style stays you can own' },
  {
    type: 'investment',
    label: 'Investments',
    tagline: 'Yield-focused holdings across short-stay clusters',
  },
];
