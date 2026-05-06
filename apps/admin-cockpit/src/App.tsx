import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from './components/AppShell.js';
import { RequireAuth } from './components/RequireAuth.js';
import { CreateLeadPage } from './pages/CreateLeadPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { LeadDetailPage } from './pages/LeadDetailPage.js';
import { LeadInboxPage } from './pages/LeadInboxPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { PipelinePage } from './pages/PipelinePage.js';
import { PropertyManagerPage } from './pages/PropertyManagerPage.js';
import { UserManagerPage } from './pages/UserManagerPage.js';
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
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/leads" element={<LeadInboxPage />} />
        <Route path="/leads/new" element={<CreateLeadPage />} />
        <Route path="/leads/:id" element={<LeadDetailPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/properties" element={<PropertyManagerPage />} />
        <Route path="/team" element={<UserManagerPage />} />
        <Route path="/workflows" element={<WorkflowsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
