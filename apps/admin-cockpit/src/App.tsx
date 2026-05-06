import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from './components/AppShell.js';
import { RequireAuth } from './components/RequireAuth.js';
import { LeadDetailPage } from './pages/LeadDetailPage.js';
import { LeadInboxPage } from './pages/LeadInboxPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { WorkflowsPage } from './pages/WorkflowsPage.js';

/** Top-level routing for the operator cockpit (Vite + React SPA). */
export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/leads" replace />} />
        <Route path="/leads" element={<LeadInboxPage />} />
        <Route path="/leads/:id" element={<LeadDetailPage />} />
        <Route path="/workflows" element={<WorkflowsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/leads" replace />} />
    </Routes>
  );
}
