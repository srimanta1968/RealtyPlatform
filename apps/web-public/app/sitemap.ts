import type { MetadataRoute } from 'next';

import { listProperties } from '../lib/api';
import { LOCATIONS } from './locations/[city]/page';

/**
 * Dynamic sitemap. Static pages always appear; the property catalog is
 * fetched at request time so newly-published rows show up without a
 * redeploy. If the upstream service is unreachable we still emit the
 * static surface so search engines never see an empty sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: 'weekly', priority: 1.0, lastModified: now },
    { url: `${baseUrl}/properties`, changeFrequency: 'daily', priority: 0.9, lastModified: now },
    { url: `${baseUrl}/contact`, changeFrequency: 'monthly', priority: 0.5, lastModified: now },
  ];

  const locationEntries: MetadataRoute.Sitemap = (Object.keys(LOCATIONS) as Array<
    keyof typeof LOCATIONS
  >).map((slug) => ({
    url: `${baseUrl}/locations/${slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
    lastModified: now,
  }));

  let propertyEntries: MetadataRoute.Sitemap = [];
  try {
    const properties = await listProperties();
    propertyEntries = properties.map((property) => ({
      url: `${baseUrl}/properties/${property.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      lastModified: new Date(property.updated_at),
    }));
  } catch {
    propertyEntries = [];
  }

  return [...staticEntries, ...locationEntries, ...propertyEntries];
}
