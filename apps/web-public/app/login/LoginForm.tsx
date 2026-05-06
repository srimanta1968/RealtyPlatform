'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button, TextField } from '@kiana/design-system';
import { useAuth } from '@kiana/ui-kit';

import { loginUser } from '../../lib/api';

interface FieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm(): JSX.Element {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    const issues: FieldErrors = {};
    const trimmed = email.trim();
    if (!trimmed) {
      issues.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(trimmed)) {
      issues.email = 'Enter a valid email address.';
    }
    if (!password) {
      issues.password = 'Password is required.';
    }
    return issues;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);

    const fieldErrors = validate();
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await loginUser(email.trim(), password);
      setSession(result.token, result.user);
      router.push('/');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white shadow-md border border-slate-200 p-8">
      <h1 className="text-2xl font-bold text-slate-900">Sign in to Kiana</h1>
      <p className="mt-2 text-sm text-slate-600">
        Welcome back. Enter the email you registered with.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        <TextField
          label="Email"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />

        <TextField
          label="Password"
          id="password"
          name="password"
          type="password"
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />

        {formError ? (
          <div
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
          >
            {formError}
          </div>
        ) : null}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New to Kiana?{' '}
        <Link href="/register" className="font-medium text-kiana-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
