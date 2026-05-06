import { useEffect, useState } from 'react';

import { Card } from '@kiana/design-system';
import type { WorkflowDefinition, WorkflowSummary } from '@kiana/contracts';

import { fetchWorkflow, listWorkflows } from '../lib/api.js';

/** Operator-facing catalog of business workflows defined on the platform. */
export function WorkflowsPage(): JSX.Element {
  const [summaries, setSummaries] = useState<WorkflowSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowDefinition | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const next = await listWorkflows();
        if (cancelled) return;
        setSummaries(next);
        if (next.length > 0 && next[0]) setActiveSlug(next[0].slug);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load workflows.');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeSlug) {
      setActiveWorkflow(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    setActiveWorkflow(null);
    void fetchWorkflow(activeSlug)
      .then((next) => {
        if (!cancelled) setActiveWorkflow(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDetailError(err instanceof Error ? err.message : 'Failed to load workflow.');
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSlug]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!summaries) {
    return <p className="text-sm text-slate-500">Loading workflows…</p>;
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Workflows</h1>
        <p className="mt-1 text-sm text-slate-600">
          {summaries.length} workflow{summaries.length === 1 ? '' : 's'} defined · the canonical
          steps every lead moves through.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <aside className="space-y-2">
          {summaries.map((summary) => {
            const selected = summary.slug === activeSlug;
            return (
              <button
                key={summary.slug}
                type="button"
                onClick={() => setActiveSlug(summary.slug)}
                className={[
                  'block w-full rounded-2xl border px-4 py-3 text-left transition',
                  selected
                    ? 'border-kiana-primary bg-kiana-primary/5 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-kiana-primary/40',
                ].join(' ')}
              >
                <p className="text-sm font-semibold text-slate-900">{summary.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {summary.step_count} step{summary.step_count === 1 ? '' : 's'}
                </p>
              </button>
            );
          })}
        </aside>

        <section>
          {detailLoading ? (
            <p className="text-sm text-slate-500">Loading workflow…</p>
          ) : detailError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {detailError}
            </div>
          ) : activeWorkflow ? (
            <Card>
              <header>
                <h2 className="text-xl font-semibold text-slate-900">{activeWorkflow.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{activeWorkflow.description}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Terminal stages:{' '}
                  {activeWorkflow.terminalStages.map((stage) => stage.replace('_', ' ')).join(', ')}
                </p>
              </header>
              <ol className="mt-6 space-y-4">
                {activeWorkflow.steps.map((step, index) => (
                  <li
                    key={step.key}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Step {index + 1}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900">{step.label}</h3>
                      <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        stage · {step.stage.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                  </li>
                ))}
              </ol>
            </Card>
          ) : (
            <p className="text-sm text-slate-500">Select a workflow to view its definition.</p>
          )}
        </section>
      </div>
    </div>
  );
}
