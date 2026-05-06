import Link from 'next/link';

import type { PropertyRecord } from '@kiana/contracts';

export interface PropertyCardProps {
  property: PropertyRecord;
}

const TYPE_LABELS: Record<string, string> = {
  villa: 'Villa',
  land: 'Land',
  retreat: 'Retreat',
  investment: 'Investment',
  apartment: 'Apartment',
  farmhouse: 'Farmhouse',
};

export function PropertyCard({ property }: PropertyCardProps): JSX.Element {
  const cover = property.media.find((m) => m.kind === 'image');
  return (
    <Link
      href={`/properties/${property.slug}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.url}
            alt={cover.alt ?? property.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            No image yet
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-kiana-primary">
          <span>{TYPE_LABELS[property.type] ?? property.type}</span>
          <span aria-hidden="true">•</span>
          <span>{property.location}</span>
        </div>
        <h3 className="mt-2 text-lg font-semibold text-slate-900 group-hover:text-kiana-primary">
          {property.title}
        </h3>
        {property.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            {property.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-4 text-sm font-medium text-slate-500">
          {formatPrice(property.price_min_minor, property.price_max_minor)}
        </p>
      </div>
    </Link>
  );
}

function formatPrice(min: number | null, max: number | null): string {
  if (min === null && max === null) return 'Price on request';
  const fmt = (paise: number): string => {
    const crore = paise / 1_00_00_000_00; // paise → ₹ → crore
    if (crore >= 1) return `₹${crore.toFixed(2)} Cr`;
    const lakh = paise / 1_00_000_00;
    return `₹${lakh.toFixed(2)} L`;
  };
  if (min !== null && max !== null && min !== max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max) as number);
}
