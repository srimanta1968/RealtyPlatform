import Link from 'next/link';

interface Location {
  slug: string;
  title: string;
  tagline: string;
  imageUrl: string;
  imageAlt: string;
}

const LOCATIONS: Location[] = [
  {
    slug: 'lonavala',
    title: 'Lonavala',
    tagline: 'Hilltop villas · 90 min from Pune',
    imageUrl:
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Misty hills of Lonavala at sunrise',
  },
  {
    slug: 'alibaug',
    title: 'Alibaug',
    tagline: 'Coastal homes · ferry from Mumbai',
    imageUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Alibaug beach at golden hour',
  },
  {
    slug: 'karjat',
    title: 'Karjat',
    tagline: 'Plots & retreats · weekend hill-country',
    imageUrl:
      'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Lush hills around Karjat',
  },
  {
    slug: 'goa',
    title: 'Goa',
    tagline: 'Managed villas · year-round yield',
    imageUrl:
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Goan coastline with palm trees',
  },
];

/**
 * Four-up location cards. Each links to /locations/<slug> which is the
 * Phase-1 location-led landing page. Photos are unsplash placeholders
 * keyed by city — swap to S3-hosted photography once the media service
 * surfaces operator-uploaded assets.
 */
export function LocationShowcase(): JSX.Element {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-kiana-primary">
            Where we work
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
            Resort-style realty across four destinations
          </h2>
          <p className="mt-4 text-slate-600">
            Each market gets a dedicated team, a vetted developer panel, and a curated set of
            listings — not a long-tail of everything that happens to be on the market.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {LOCATIONS.map((loc) => (
            <Link
              key={loc.slug}
              href={`/locations/${loc.slug}`}
              className="group relative overflow-hidden rounded-2xl bg-slate-900 shadow-sm"
            >
              <div className="aspect-[3/4] w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={loc.imageUrl}
                  alt={loc.imageAlt}
                  className="h-full w-full object-cover opacity-80 transition group-hover:scale-105 group-hover:opacity-100"
                  loading="lazy"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 text-white">
                <div className="text-2xl font-bold">{loc.title}</div>
                <div className="mt-1 text-sm opacity-90">{loc.tagline}</div>
                <div className="mt-3 inline-flex items-center text-xs font-semibold uppercase tracking-wider text-kiana-accent">
                  Explore listings →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
