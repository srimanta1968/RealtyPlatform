import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@kiana/design-system';
import type { LeadRecord, WorkflowMetrics } from '@kiana/contracts';
import type { StaleLeadsReport } from '@kiana/sdk';

import { fetchStaleLeads, fetchWorkflowMetrics, listLeads } from '../lib/api.js';

const DEFAULT_WORKFLOW = 'lead-to-customer';
const STALE_DAYS = 7;
const RECENT_COUNT = 5;

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/** Operator monitoring dashboard — funnel + stale leads + recent activity at a glance. */
export function DashboardPage(): JSX.Element {
  const [metrics, setMetrics] = useState<WorkflowMetrics | null>(null);
  const [stale, setStale] = useState<StaleLeadsReport | null>(null);
  const [recent, setRecent] = useState<LeadRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const [metricsResult, staleResult, recentResult] = await Promise.all([
          fetchWorkflowMetrics(DEFAULT_WORKFLOW),
          fetchStaleLeads(STALE_DAYS, DEFAULT_WORKFLOW),
          listLeads(),
        ]);
        if (cancelled) return;
        setMetrics(metricsResult);
        setStale(staleResult);
        setRecent(
          [...recentResult]
            .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
            .slice(0, RECENT_COUNT),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!metrics || !stale || !recent) {
    return <p className="text-sm text-slate-500">Loading dashboard…</p>;
  }

  return (
    <div className="space-y-4">
      <header className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Live snapshot of the lead-to-customer pipeline · refresh the page to recompute.
        </p>
      </header>

      <Card>
        <header className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Pipeline · {metrics.workflow_slug}
          </h2>
          <Link to="/workflows" className="text-xs text-kiana-primary hover:underline">
            View workflow →
          </Link>
        </header>
        <dl className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Total leads" value={String(metrics.total_leads)} />
          <Stat label="Active" value={String(metrics.active_leads)} />
          <Stat
            label="Conversion"
            value={formatPercent(metrics.conversion_rate)}
            hint={`${metrics.converted} converted`}
          />
          <Stat
            label="Loss"
            value={formatPercent(metrics.loss_rate)}
            hint={`${metrics.lost} lost`}
          />
        </dl>
        <div className="mt-6 grid gap-3 md:grid-cols-7">
          {metrics.steps.map((step) => (
            <div key={step.step_key} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {step.step_key.replace('_', ' ')}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{step.count_at}</p>
              <p className="text-xs text-slate-500">
                Reached: {step.count_reached} ({formatPercent(step.reach_rate)})
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <header className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Stale leads · &gt; {stale.threshold_days} days untouched
          </h2>
          <span className="text-xs text-slate-500">
            Older than {new Date(stale.older_than).toLocaleDateString()}
          </span>
        </header>
        {stale.leads.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Nothing stale — every active lead has been touched in the last {stale.threshold_days}{' '}
            days.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {stale.leads.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <Link
                    to={`/leads/${lead.id}`}
                    className="text-sm font-medium text-slate-900 hover:text-kiana-primary"
                  >
                    {lead.full_name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    Stage · {lead.stage.replace('_', ' ')} · last touched{' '}
                    {new Date(lead.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {lead.email ?? lead.phone ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <header className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Recent leads
          </h2>
          <Link to="/leads" className="text-xs text-kiana-primary hover:underline">
            Inbox →
          </Link>
        </header>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No leads captured yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {recent.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <Link
                    to={`/leads/${lead.id}`}
                    className="text-sm font-medium text-slate-900 hover:text-kiana-primary"
                  >
                    {lead.full_name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    Source · {lead.source} · captured{' '}
                    {new Date(lead.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {lead.stage.replace('_', ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}): JSX.Element {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-xl font-bold text-slate-900">{value}</dd>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
