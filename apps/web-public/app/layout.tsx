import type { Metadata } from 'next';

import { AuthProvider } from '@kiana/ui-kit';

import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Kiana Realty — resort-style villas, retreats & investments',
    template: '%s | Kiana Realty',
  },
  description:
    'Curated villas, plots, retreats, and yield-focused investments across Lonavala, Alibaug, Karjat & Goa. Verified listings, transparent diligence, and a presales team that picks up the phone.',
  keywords: [
    'lonavala villas',
    'alibaug villa',
    'karjat plots',
    'goa villa investment',
    'second home India',
    'resort-style realty',
  ],
  openGraph: {
    type: 'website',
    siteName: 'Kiana Realty',
    title: 'Kiana Realty — resort-style villas, retreats & investments',
    description:
      'Curated villas, plots, retreats, and yield-focused investments across Lonavala, Alibaug, Karjat & Goa.',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kiana Realty',
    description: 'Curated villas, retreats, and investments across Maharashtra & Goa.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
