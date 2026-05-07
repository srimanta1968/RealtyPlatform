import Link from 'next/link';

import { UserMenu } from './UserMenu';

export interface SiteHeaderProps {
  /** When true, the header renders translucent over a hero image. */
  transparent?: boolean;
}

/**
 * Shared top navigation. Used unstyled-overlay on the home hero
 * (transparent=true) and as a solid bar on every other page.
 */
export function SiteHeader({ transparent = false }: SiteHeaderProps): JSX.Element {
  const containerClasses = transparent
    ? 'absolute inset-x-0 top-0 z-20'
    : 'border-b border-slate-200 bg-white';
  const linkClasses = transparent
    ? 'text-white/90 hover:text-white'
    : 'text-slate-700 hover:text-kiana-primary';
  const brandClasses = transparent ? 'text-white' : 'text-slate-900';

  return (
    <header className={containerClasses}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className={`text-xl font-semibold tracking-tight ${brandClasses}`}
        >
          Kiana Realty
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/properties" className={linkClasses}>
            Properties
          </Link>
          <Link href="/locations/lonavala" className={`hidden md:inline ${linkClasses}`}>
            Lonavala
          </Link>
          <Link href="/locations/alibaug" className={`hidden md:inline ${linkClasses}`}>
            Alibaug
          </Link>
          <Link href="/locations/goa" className={`hidden md:inline ${linkClasses}`}>
            Goa
          </Link>
          <Link href="/contact" className={linkClasses}>
            Contact
          </Link>
          <UserMenu transparent={transparent} />
        </nav>
      </div>
    </header>
  );
}
