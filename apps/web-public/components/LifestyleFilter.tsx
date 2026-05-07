'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import type { PropertyType } from '@kiana/contracts';

import { LIFESTYLE_FILTERS } from '../lib/lifestyle-filters';

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
