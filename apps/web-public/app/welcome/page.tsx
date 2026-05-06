'use client';

import Link from 'next/link';

import { useAuth } from '@kiana/ui-kit';

export default function WelcomePage(): JSX.Element {
  const { user, hydrated } = useAuth();

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md text-center rounded-2xl bg-white shadow-md border border-slate-200 p-10">
        <h1 className="text-3xl font-bold text-slate-900">Welcome to Kiana Realty</h1>
        <p className="mt-3 text-slate-600">
          {hydrated && user?.email
            ? `Your account ${user.email} is ready.`
            : 'Your account is ready.'}
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-kiana-primary px-6 py-3 font-semibold text-white"
        >
          Continue to dashboard
        </Link>
      </div>
    </main>
  );
}
