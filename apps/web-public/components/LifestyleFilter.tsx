'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import type { PropertyType } from '@kiana/contracts';

export const LIFESTYLE_FILTERS: { type: PropertyType | 'all'; label: string; tagline: string }[] = [
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

export interface LifestyleFilterProps {
  active: PropertyType | 'all';
}

export function LifestyleFilter({ active }: LifestyleFilterProps): JSX.Element {
  const router = useRouter();
  const params = useSearchParams();

  const onPick = useCallback(
    (type: PropertyType | 'all') => {
      const next = new URLSearchParams(params?.toString());
      if (type === 'all') {
        next.delete('type');
      } else {
        next.set('type', type);
      }
      const qs = next.toString();
      router.push(qs ? `/properties?${qs}` : '/properties');
    },
    [params, router],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {LIFESTYLE_FILTERS.map((filter) => {
        const isActive = filter.type === active;
        return (
          <button
            key={filter.type}
            type="button"
            onClick={() => onPick(filter.type)}
            className={`rounded-2xl border p-4 text-left transition ${
              isActive
                ? 'border-kiana-primary bg-kiana-primary/5 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
            aria-pressed={isActive}
          >
            <div className="text-sm font-semibold text-slate-900">{filter.label}</div>
            <div className="mt-1 text-xs text-slate-500">{filter.tagline}</div>
          </button>
        );
      })}
    </div>
  );
}
