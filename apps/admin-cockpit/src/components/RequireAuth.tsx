import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@kiana/ui-kit';

export interface RequireAuthProps {
  children: ReactNode;
}

/** Route guard — bounce to /login when no token is on file; pause while hydrating. */
export function RequireAuth({ children }: RequireAuthProps): JSX.Element {
  const { token, hydrated, validating } = useAuth();
  const location = useLocation();

  if (!hydrated || validating) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate-500">
        Loading session…
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
