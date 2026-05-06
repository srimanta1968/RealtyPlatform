import { Link, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '@kiana/ui-kit';

import { authClient } from '../lib/api.js';

/** Shell that wraps every authenticated cockpit page — header + nav + outlet. */
export function AppShell(): JSX.Element {
  const { user, clearSession } = useAuth();
  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    try {
      await authClient.logout();
    } catch {
      // Stateless JWT — clearing client side is enough either way.
    }
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/leads" className="text-lg font-semibold text-slate-900">
            Kiana Cockpit
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/leads" className="font-medium text-slate-700 hover:text-kiana-primary">
              Leads
            </Link>
            <span className="hidden text-xs text-slate-500 sm:inline">{user?.email}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
