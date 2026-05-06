'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { Button } from '@kiana/design-system';
import { useAuth } from '@kiana/ui-kit';

import { resendVerification, verifyEmail } from '../../lib/api';

type Status = 'idle' | 'verifying' | 'success' | 'error';

function VerifyEmailInner(): JSX.Element {
  const params = useSearchParams();
  const token = params.get('token');
  const { user, setSession, token: sessionToken } = useAuth();
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendingFor, setResendingFor] = useState<string | null>(null);
  const [resentNotice, setResentNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Missing verification token. Open the link from your email again.');
      return;
    }

    let cancelled = false;
    setStatus('verifying');
    verifyEmail(token)
      .then((result) => {
        if (cancelled) return;
        if (sessionToken) {
          setSession(sessionToken, result.user);
        }
        setStatus('success');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Verification failed. Please try again.';
        setErrorMessage(message);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [token, sessionToken, setSession]);

  async function handleResend(): Promise<void> {
    if (!user?.email) {
      setResentNotice(
        'We need to know which account to resend to — please log in or use the link from your registration response.',
      );
      return;
    }
    try {
      setResendingFor(user.email);
      await resendVerification(user.email);
      setResentNotice(`A fresh verification link was sent to ${user.email}.`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not resend the verification email.';
      setResentNotice(message);
    } finally {
      setResendingFor(null);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md text-center rounded-2xl bg-white shadow-md border border-slate-200 p-10">
        {status === 'verifying' ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900">Verifying your email…</h1>
            <p className="mt-3 text-slate-600">Hold on a moment.</p>
          </>
        ) : null}

        {status === 'success' ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900">Email verified</h1>
            <p className="mt-3 text-slate-600">
              {user?.email
                ? `Your address ${user.email} is confirmed. You can now access everything in Kiana Realty.`
                : 'Your address is confirmed. You can now access everything in Kiana Realty.'}
            </p>
            <Link
              href="/"
              className="mt-8 inline-block rounded-full bg-kiana-primary px-6 py-3 font-semibold text-white"
            >
              Continue to dashboard
            </Link>
          </>
        ) : null}

        {status === 'error' ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900">Verification failed</h1>
            <p className="mt-3 text-slate-600">{errorMessage}</p>
            <div className="mt-6 flex flex-col gap-3 items-center">
              <Button
                type="button"
                variant="primary"
                onClick={handleResend}
                disabled={resendingFor !== null}
              >
                {resendingFor ? 'Sending…' : 'Resend verification email'}
              </Button>
              <Link href="/register" className="text-sm text-slate-500 hover:text-slate-700">
                Back to registration
              </Link>
            </div>
            {resentNotice ? (
              <p className="mt-4 text-xs text-slate-500">{resentNotice}</p>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}

export default function VerifyEmailPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-slate-500">Loading…</p>
        </main>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
