import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CTAButtons } from '../../../components/CTAButtons';
import { PropertyCard } from '../../../components/PropertyCard';
import { listProperties } from '../../../lib/api';

interface PageProps {
  params: { city: string };
}

/**
 * Phase-1 location-led landing pages — Phase-1-Trust-Launch.md §7.
 * Each entry is the URL slug; the title / tagline drive both the
 * heading copy and the SEO meta. Add new cities by appending to the
 * dictionary; the page generates statically for known slugs and
 * 404s otherwise.
 */
export const LOCATIONS = {
  lonavala: {
    title: 'Lonavala',
    tagline:
      'Hilltop villas and weekend retreats in the heart of the Lonavala–Khandala belt — 90 minutes from Pune.',
    locationFilter: 'Lonavala',
    intro:
      'Kiana&apos;s Lonavala portfolio is curated for monsoon-loving weekenders, second-home buyers, and short-stay investors. From cliff-edge villas to gated retreats, every property is verified, RERA-checked, and ready for a site visit.',
  },
  alibaug: {
    title: 'Alibaug',
    tagline:
      'Coastal homes a short ferry ride from Mumbai — Alibaug villas, beachfront plots, and short-stay investments.',
    locationFilter: 'Alibaug',
    intro:
      'Alibaug has matured from weekender to year-round destination. We work with developers and individual sellers to surface only listings that pass Kiana&apos;s diligence — title clear, RERA registered, and operationally ready.',
  },
  karjat: {
    title: 'Karjat',
    tagline:
      'Build-your-own plots and managed retreats around Karjat — close enough to Mumbai for a Friday-night drive.',
    locationFilter: 'Karjat',
    intro:
      'Karjat is the Maharashtra hill-country bet for buyers who want land they can shape themselves. Kiana surfaces RERA-cleared plots, ready-to-occupy villas, and managed retreats with proven occupancy.',
  },
  goa: {
    title: 'Goa',
    tagline: 'Fractional and full-ownership villas in North & South Goa — operated, maintained, monetised.',
    locationFilter: 'Goa',
    intro:
      'Goa is a different kind of buy — the calculus is part lifestyle, part yield. Kiana&apos;s Goa inventory leans on operators with managed-rental track records so the home pays for itself between your visits.',
  },
} as const;

export type LocationSlug = keyof typeof LOCATIONS;

export function generateStaticParams(): { city: LocationSlug }[] {
  return (Object.keys(LOCATIONS) as LocationSlug[]).map((city) => ({ city }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const meta = LOCATIONS[params.city as LocationSlug];
  if (!meta) return { title: 'Locations — Kiana Realty' };
  return {
    title: `${meta.title} properties — Kiana Realty`,
    description: meta.tagline,
    alternates: { canonical: `/locations/${params.city}` },
    openGraph: {
      title: `${meta.title} properties — Kiana Realty`,
      description: meta.tagline,
      type: 'website',
    },
  };
}

export default async function LocationLandingPage({ params }: PageProps): Promise<JSX.Element> {
  const meta = LOCATIONS[params.city as LocationSlug];
  if (!meta) notFound();

  const properties = await listProperties({ location: meta.locationFilter }).catch(() => []);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${meta.title} properties`,
    description: meta.tagline,
    url: `/locations/${params.city}`,
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="bg-kiana-primary text-white">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Kiana Realty
          </Link>
          <Link href="/properties" className="text-sm font-semibold underline-offset-4 hover:underline">
            All properties
          </Link>
        </div>
      </header>

      <section className="bg-gradient-to-br from-kiana-primary to-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-xs uppercase tracking-widest text-kiana-accent">Location</p>
          <h1 className="mt-2 text-4xl md:text-6xl font-bold tracking-tight">{meta.title}</h1>
          <p
            className="mt-4 max-w-2xl text-slate-200"
            dangerouslySetInnerHTML={{ __html: meta.tagline }}
          />
          <div className="mt-8">
            <CTAButtons />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12">
        <p
          className="text-base leading-relaxed text-slate-700"
          dangerouslySetInnerHTML={{ __html: meta.intro }}
        />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="mb-6 text-2xl font-semibold text-slate-900">
          Live listings in {meta.title}
        </h2>
        {properties.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-600">
            <p className="text-lg font-semibold text-slate-800">
              We&apos;re between releases for {meta.title}.
            </p>
            <p className="mt-2 text-sm">
              <Link href="/contact" className="text-kiana-primary underline">
                Tell us what you&apos;re looking for
              </Link>{' '}
              and we&apos;ll surface off-market options as they come up.
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
