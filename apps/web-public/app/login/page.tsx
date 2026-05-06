import type { Metadata } from 'next';

import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign in · Kiana Realty',
};

/** Server Component shell for the /login route — the form is a Client Component. */
export default function LoginPage(): JSX.Element {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
