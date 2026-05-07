import Link from 'next/link';

import type { PropertyRecord } from '@kiana/contracts';

import { CTAButtons } from '../components/CTAButtons';
import { LocationShowcase } from '../components/LocationShowcase';
import { PropertyCard } from '../components/PropertyCard';
import { SiteHeader } from '../components/SiteHeader';
import { StatStrip } from '../components/StatStrip';
import { listProperties } from '../lib/api';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1920&q=80';

const VALUE_PROPS = [
  {
    title: 'Curated, not catalogued',
    body: 'Every listing passes Kiana diligence — title clear, RERA registered, walk-through verified. We turn down the listings that don’t make the cut.',
  },
  {
    title: 'A presales team that picks up',
    body: 'Reach a specialist within 30 minutes during business hours. No call-centres, no pre-canned scripts — actual people who know each property.',
  },
  {
    title: 'From browse to keys, end-to-end',
    body: 'We organise the site visit, the legal sign-off, the registration, and (for managed properties) the rental operations after handover.',
  },
];

const PROCESS_STEPS = [
  {
    step: '01',
    title: 'Tell us what you want',
    body: 'Lifestyle category (villa / land / retreat / investment), location, budget. We surface the matches — including off-market options where they exist.',
  },
  {
    step: '02',
    title: 'See it in person',
    body: 'Site visits chauffeur-led from the nearest city. Brochure + video walk-through if you can’t travel yet. No pressure, no brokerage on the first visit.',
  },
  {
    step: '03',
    title: 'Buy with diligence',
    body: 'Title check, RERA verification, registration, and bank coordination handled by our in-house legal panel.',
  },
  {
    step: '04',
    title: 'Live, rent, or invest',
    body: 'For managed-rental properties, our operations team takes over after handover — cleaning, guest comms, dynamic pricing.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      '“Kiana found us a Lonavala villa that was never on a portal. The site visit was a Sunday morning trip up from Pune; we signed three weeks later.”',
    name: 'Aditi & Rohan M.',
    context: 'Lonavala buyers, 2025',
  },
  {
    quote:
      '“The operations side is what sold me. They handle the rentals when I’m not there — I’ve been hands-off for nine months and the yield speaks for itself.”',
    name: 'Vikram S.',
    context: 'Goa investor, 2025',
  },
  {
    quote:
      '“My first time buying outside Mumbai. They walked me through everything — title, RERA, registration. I knew what I was signing.”',
    name: 'Neha K.',
    context: 'Alibaug buyer, 2024',
  },
];

/**
 * Home page — Phase-1 marketing surface. Pulls live published properties
 * from the catalog so the "Featured" grid hydrates with whatever is on
 * offer right now; falls back to a clean empty state if the API is
 * unreachable. Server-rendered for SEO + cold-start latency.
 */
export default async function HomePage(): Promise<JSX.Element> {
  const featured: PropertyRecord[] = await listProperties().catch(() => []);
  const featuredSlice = featured.slice(0, 6);

  // Org-level JSON-LD so search engines pick up the brand + locations.
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: 'Kiana Realty',
    url: 'https://kiana.example.com',
    areaServed: ['Lonavala', 'Alibaug', 'Karjat', 'Goa'],
    sameAs: [],
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />

      <SiteHeader transparent />

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMAGE}
            alt="Hilltop villa with valley views"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900/70" />
        </div>
        <div className="mx-auto max-w-6xl px-6 pt-32 pb-24 text-white md:pt-44 md:pb-36">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-kiana-accent">
            Resort-style realty · Maharashtra & Goa
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Hilltop villas, coastal homes, and yield-bearing retreats — vetted before they reach you.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/85">
            Kiana curates a small, deeply diligenced inventory across Lonavala, Alibaug, Karjat,
            and Goa. We surface fewer listings, but every one is title-clear, RERA-registered,
            and visit-ready.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/properties"
              className="rounded-full bg-kiana-accent px-7 py-3 text-center text-sm font-semibold text-slate-900 transition hover:opacity-95"
            >
              Browse properties
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-white/40 px-7 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Talk to a specialist
            </Link>
          </div>
        </div>
      </section>

      <StatStrip />

      <LocationShowcase />

      {/* Featured listings */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-kiana-primary">
                What’s live now
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
                Featured listings
              </h2>
              <p className="mt-3 text-slate-600">
                A snapshot from the live catalog. Filter by lifestyle category or location to see
                everything currently on offer.
              </p>
            </div>
            <Link
              href="/properties"
              className="text-sm font-semibold text-kiana-primary underline-offset-4 hover:underline"
            >
              View all listings →
            </Link>
          </div>

          {featuredSlice.length === 0 ? (
            <div className="mt-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
              <p className="text-lg font-semibold text-slate-800">
                We’re between releases — fresh listings drop every fortnight.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                <Link href="/contact" className="text-kiana-primary underline">
                  Tell us what you’re after
                </Link>
                {' '}and we’ll surface off-market options as they come up.
              </p>
            </div>
          ) : (
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredSlice.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Value props */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-kiana-primary">
              Why Kiana
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
              We do less, but we do it carefully
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {VALUE_PROPS.map((prop) => (
              <div
                key={prop.title}
                className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
              >
                <h3 className="text-xl font-semibold text-slate-900">{prop.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{prop.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-kiana-primary">
              How it works
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
              From first conversation to keys in hand
            </h2>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PROCESS_STEPS.map((step) => (
              <li
                key={step.step}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="text-sm font-semibold text-kiana-primary">{step.step}</div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-kiana-accent">
              In their words
            </p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Buyers who took the trip</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur"
              >
                <blockquote className="text-base leading-relaxed text-white/90">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-5 text-sm">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-white/60">{t.context}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA panel */}
      <section className="bg-gradient-to-br from-kiana-primary to-slate-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[2fr_1fr] md:items-center">
          <div>
            <h2 className="text-3xl font-bold md:text-4xl">
              Ready to see what we have right now?
            </h2>
            <p className="mt-4 max-w-xl text-white/80">
              Tell us what kind of property you’re after and the team will line up the next
              site visit. WhatsApp is the fastest channel; the consultation form goes to a real
              human inbox.
            </p>
          </div>
          <div className="md:justify-self-end">
            <CTAButtons />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-300">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-lg font-semibold text-white">Kiana Realty</div>
            <p className="mt-3 max-w-md text-sm text-slate-400">
              Curated villas, plots, retreats, and investments across Maharashtra & Goa.
              Operated by Insignia.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Locations</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/locations/lonavala" className="hover:text-white">
                  Lonavala
                </Link>
              </li>
              <li>
                <Link href="/locations/alibaug" className="hover:text-white">
                  Alibaug
                </Link>
              </li>
              <li>
                <Link href="/locations/karjat" className="hover:text-white">
                  Karjat
                </Link>
              </li>
              <li>
                <Link href="/locations/goa" className="hover:text-white">
                  Goa
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Company</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/properties" className="hover:text-white">
                  All properties
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white">
                  Create an account
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
            <span>&copy; {new Date().getFullYear()} Kiana Realty Growth Platform.</span>
            <span>Operated by Insignia. RERA registration on each property page.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
