'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@kiana/ui-kit';

import { logoutUser } from '../lib/api';

export interface UserMenuProps {
  /** When true, renders for use over a dark hero (light-on-dark text). */
  transparent?: boolean;
}

/**
 * Header user menu — shows the active account's email + a Sign-out button
 * when authenticated, or a Sign in / Get started pair when anonymous.
 *
 * Server Components in apps/web-public render around this Client Component
 * so the marketing pages stay statically renderable. The `transparent`
 * prop swaps the colour palette for use on the home hero overlay.
 */
export function UserMenu({ transparent = false }: UserMenuProps = {}): JSX.Element {
  const router = useRouter();
  const { user, hydrated, clearSession } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut(): Promise<void> {
    setSigningOut(true);
    try {
      await logoutUser();
    } catch {
      // Logout endpoint is best-effort in Phase 1 — clear the client-side
      // session even if the server call failed (network, expired token).
    } finally {
      clearSession();
      setSigningOut(false);
      router.push('/');
      router.refresh();
    }
  }

  const linkClasses = transparent
    ? 'hidden sm:inline-block text-sm text-white/80 hover:text-white'
    : 'hidden sm:inline-block text-sm text-slate-600 hover:text-kiana-primary';
  const emailClasses = transparent
    ? 'hidden sm:inline-block text-sm text-white/80'
    : 'hidden sm:inline-block text-sm text-slate-600';
  const signOutClasses = transparent
    ? 'rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60'
    : 'rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60';
  const placeholderClasses = transparent
    ? 'text-sm text-white/70'
    : 'text-sm text-slate-400';

  if (!hydrated) {
    return <span className={placeholderClasses}>…</span>;
  }

  if (!user) {
    return (
      <>
        <Link href="/login" className={linkClasses}>
          Sign in
        </Link>
        <Link
          href="/register"
          className="rounded-full bg-kiana-accent px-4 py-2 text-sm font-semibold text-slate-900 hover:opacity-90"
        >
          Get started
        </Link>
      </>
    );
  }

  return (
    <>
      <span className={emailClasses}>{user.email}</span>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className={signOutClasses}
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </>
  );
}
