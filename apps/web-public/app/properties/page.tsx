import type { Metadata } from 'next';
import Link from 'next/link';

import type { PropertyRecord, PropertyType } from '@kiana/contracts';

import { LifestyleFilter, LIFESTYLE_FILTERS } from '../../components/LifestyleFilter';
import { PropertyCard } from '../../components/PropertyCard';
import { listProperties } from '../../lib/api';

export const metadata: Metadata = {
  title: 'Properties — Kiana Realty',
  description:
    'Resort-style villas, land, retreats, and investments curated by Kiana Realty. Filter by lifestyle category and locality.',
  alternates: { canonical: '/properties' },
  openGraph: {
    title: 'Properties — Kiana Realty',
    description:
      'Resort-style villas, land, retreats, and investments curated by Kiana Realty.',
    type: 'website',
  },
};

interface PageProps {
  searchParams?: { type?: string; location?: string };
}

const VALID_TYPES: PropertyType[] = ['villa', 'land', 'retreat', 'investment', 'apartment', 'farmhouse'];

/**
 * Public properties listing — server-rendered, cached by Next so it
 * SSR-streams the catalog from property-service. Optional ?type and
 * ?location querystrings narrow the result set; ?type maps onto the
 * lifestyle-filter pills above the grid.
 */
export default async function PropertiesPage({ searchParams }: PageProps): Promise<JSX.Element> {
  const rawType = searchParams?.type;
  const type = (rawType && (VALID_TYPES as string[]).includes(rawType)
    ? (rawType as PropertyType)
    : undefined);
  const location = searchParams?.location?.trim() || undefined;

  let properties: PropertyRecord[] = [];
  let loadError: string | null = null;
  try {
    properties = await listProperties({
      ...(type ? { type } : {}),
      ...(location ? { location } : {}),
    });
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load properties.';
  }

  const activeFilter = (type ?? 'all') as PropertyType | 'all';
  const activeMeta =
    LIFESTYLE_FILTERS.find((f) => f.type === activeFilter) ?? LIFESTYLE_FILTERS[0];

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="bg-kiana-primary text-white">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Kiana Realty
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/properties" className="font-semibold underline-offset-4 hover:underline">
              Properties
            </Link>
            <Link href="/contact" className="font-semibold underline-offset-4 hover:underline">
              Contact
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-br from-kiana-primary to-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <p className="text-xs uppercase tracking-widest text-kiana-accent">Properties</p>
          <h1 className="mt-2 text-3xl md:text-5xl font-bold tracking-tight">
            {activeMeta?.label ?? 'All listings'}
          </h1>
          <p className="mt-3 max-w-2xl text-slate-200">
            {activeMeta?.tagline ?? 'Every property currently on offer.'}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <LifestyleFilter active={activeFilter} />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        {loadError ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
            We couldn&apos;t load the catalog right now ({loadError}). Please try again shortly.
          </div>
        ) : properties.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-600">
            <p className="text-lg font-semibold text-slate-800">Nothing live yet in this category.</p>
            <p className="mt-2 text-sm">
              Try a different lifestyle category or{' '}
              <Link href="/contact" className="text-kiana-primary underline">
                tell us what you&apos;re looking for
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
