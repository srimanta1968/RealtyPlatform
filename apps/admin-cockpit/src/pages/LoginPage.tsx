import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { Button, Card, TextField } from '@kiana/design-system';
import { useAuth } from '@kiana/ui-kit';

import { authClient } from '../lib/api.js';

interface LocationState {
  from?: string;
}

/** Operator login screen — feeds the JWT into AuthProvider on success. */
export function LoginPage(): JSX.Element {
  const { token, setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (token) {
    return <Navigate to="/leads" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const session = await authClient.login({ email: email.trim(), password });
      setSession(session.token, session.user);
      const dest = (location.state as LocationState | null)?.from ?? '/leads';
      navigate(dest, { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not sign you in. Check your credentials.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-900">Sign in to Kiana Cockpit</h1>
        <p className="mt-1 text-sm text-slate-600">Operator access only.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <TextField
            label="Email"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            label="Password"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {formError ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {formError}
            </div>
          ) : null}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
