'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@kiana/ui-kit';

import { logoutUser } from '../lib/api';

/**
 * Header user menu — shows the active account's email + a Sign-out button
 * when authenticated, or a Sign in / Get started pair when anonymous.
 *
 * Server Components in apps/web-public render around this Client Component
 * so the marketing pages stay statically renderable.
 */
export function UserMenu(): JSX.Element {
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

  if (!hydrated) {
    return <span className="text-sm text-white/70">…</span>;
  }

  if (!user) {
    return (
      <>
        <Link
          href="/login"
          className="hidden sm:inline-block text-sm text-white/80 hover:text-white"
        >
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
      <span className="hidden sm:inline-block text-sm text-white/80">{user.email}</span>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-60"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </>
  );
}
