import type { Metadata } from 'next';

import { AuthProvider } from '@kiana/ui-kit';

import './globals.css';

export const metadata: Metadata = {
  title: 'Kiana Realty Growth Platform',
  description:
    'Resort-style realty platform — CRM, lead management, site-visit operations, and AI-native workflows.',
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
