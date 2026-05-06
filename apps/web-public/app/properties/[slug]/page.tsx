import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { PropertyRecord } from '@kiana/contracts';

import { CTAButtons } from '../../../components/CTAButtons';
import { getPropertyBySlug } from '../../../lib/api';

interface PageProps {
  params: { slug: string };
}

/**
 * Per-page <head> override. Pulls the canonical property from the
 * public detail endpoint so the title / description / OG card reflect
 * what's actually on the page; falls back to a generic title when
 * the lookup fails (we still render a 404 below).
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const property = await getPropertyBySlug(params.slug);
    return {
      title: `${property.title} — Kiana Realty`,
      description: `${property.title} in ${property.location}. Book a site visit or talk to a presales specialist on Kiana Realty.`,
      alternates: { canonical: `/properties/${property.slug}` },
      openGraph: {
        title: `${property.title} — Kiana Realty`,
        description: `${property.title} in ${property.location}.`,
        type: 'article',
        images: property.media
          .filter((m) => m.kind === 'image')
          .slice(0, 1)
          .map((m) => ({ url: m.url, alt: m.alt ?? property.title })),
      },
    };
  } catch {
    return { title: 'Property — Kiana Realty' };
  }
}

export default async function PropertyDetailPage({ params }: PageProps): Promise<JSX.Element> {
  let property: PropertyRecord;
  try {
    property = await getPropertyBySlug(params.slug);
  } catch {
    notFound();
  }

  const images = property.media.filter((m) => m.kind === 'image');
  const brochure = property.media.find((m) => m.kind === 'brochure');
  const mapQuery = encodeURIComponent(`${property.title}, ${property.location}`);
  const mapEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&output=embed`;

  // JSON-LD: Real estate listings benefit from schema.org structured
  // data. We emit a minimal Product/Place hybrid so search results pick
  // up the location + offer copy without forcing a full ListingItem.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.title,
    description: `${property.title} in ${property.location}`,
    address: { '@type': 'PostalAddress', addressLocality: property.location },
    image: images.map((m) => m.url),
    url: `/properties/${property.slug}`,
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
            ← All properties
          </Link>
        </div>
      </header>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-xs uppercase tracking-widest text-kiana-primary">
            {property.type} • {property.location}
          </p>
          <h1 className="mt-2 text-3xl md:text-5xl font-bold tracking-tight text-slate-900">
            {property.title}
          </h1>
          <p className="mt-4 text-slate-600">
            Status: <span className="font-medium uppercase">{property.status}</span>
          </p>
        </div>
      </section>

      {images.length > 0 ? (
        <section className="mx-auto max-w-6xl px-6 py-8">
          <div className="grid gap-3 md:grid-cols-3">
            {images.slice(0, 6).map((m, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${m.url}-${idx}`}
                src={m.url}
                alt={m.alt ?? property.title}
                className={`w-full rounded-2xl object-cover ${
                  idx === 0 ? 'md:col-span-2 md:row-span-2 aspect-[16/10]' : 'aspect-[4/3]'
                }`}
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-6 py-10 grid gap-10 md:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">About this property</h2>
          {property.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {property.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-3 py-1 text-slate-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          <p className="mt-6 text-slate-600">
            Speak with our presales team for the full brochure, RERA details, and a guided
            virtual walk-through. Most buyers visit Kiana&apos;s {property.location.toLowerCase()}{' '}
            inventory in person before deciding.
          </p>
          {brochure ? (
            <a
              href={brochure.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-block rounded-full border border-kiana-primary px-5 py-2 text-sm font-semibold text-kiana-primary hover:bg-kiana-primary hover:text-white"
            >
              Download brochure
            </a>
          ) : null}
        </div>
        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Talk to Kiana</h3>
          <p className="mt-2 text-sm text-slate-600">
            Pick the channel that suits you. Our presales team responds within 30 minutes during
            business hours.
          </p>
          <div className="mt-5">
            <CTAButtons propertyTitle={property.title} propertySlug={property.slug} />
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="text-2xl font-semibold text-slate-900">Location</h2>
        <p className="mt-2 text-slate-600">{property.location}</p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <iframe
            title={`Map of ${property.title}`}
            src={mapEmbedUrl}
            width="100%"
            height="380"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </section>
    </main>
  );
}
