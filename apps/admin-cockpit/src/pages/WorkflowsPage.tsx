import { useEffect, useState } from 'react';

import { Card } from '@kiana/design-system';
import type { WorkflowDefinition, WorkflowMetrics, WorkflowSummary } from '@kiana/contracts';

import { fetchWorkflow, fetchWorkflowMetrics, listWorkflows } from '../lib/api.js';

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/** Operator-facing catalog of business workflows defined on the platform. */
export function WorkflowsPage(): JSX.Element {
  const [summaries, setSummaries] = useState<WorkflowSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowDefinition | null>(null);
  const [activeMetrics, setActiveMetrics] = useState<WorkflowMetrics | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

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
      setActiveMetrics(null);
      return;
    }
    const slug = activeSlug;
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    setMetricsError(null);
    setActiveWorkflow(null);
    setActiveMetrics(null);
    void Promise.allSettled([fetchWorkflow(slug), fetchWorkflowMetrics(slug)])
      .then(([definitionResult, metricsResult]) => {
        if (cancelled) return;
        if (definitionResult.status === 'fulfilled') {
          setActiveWorkflow(definitionResult.value);
        } else {
          const err = definitionResult.reason;
          setDetailError(err instanceof Error ? err.message : 'Failed to load workflow.');
        }
        if (metricsResult.status === 'fulfilled') {
          setActiveMetrics(metricsResult.value);
        } else {
          const err = metricsResult.reason;
          setMetricsError(err instanceof Error ? err.message : 'Failed to load metrics.');
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
            <div className="space-y-4">
              <Card>
                <header>
                  <h2 className="text-xl font-semibold text-slate-900">{activeWorkflow.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{activeWorkflow.description}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Terminal stages:{' '}
                    {activeWorkflow.terminalStages
                      .map((stage) => stage.replace('_', ' '))
                      .join(', ')}
                  </p>
                </header>
                <ol className="mt-6 space-y-4">
                  {activeWorkflow.steps.map((step, index) => {
                    const metric = activeMetrics?.steps.find((row) => row.step_key === step.key);
                    return (
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
                        {metric ? (
                          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                            <span>
                              At step:{' '}
                              <span className="font-semibold text-slate-700">
                                {metric.count_at}
                              </span>
                            </span>
                            <span>
                              Reached:{' '}
                              <span className="font-semibold text-slate-700">
                                {metric.count_reached}
                              </span>{' '}
                              ({formatPercent(metric.reach_rate)})
                            </span>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </Card>

              <Card>
                <header className="flex items-baseline justify-between">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
                    Metrics
                  </h2>
                  {activeMetrics ? (
                    <span className="text-xs text-slate-500">
                      {activeMetrics.total_leads} total · {activeMetrics.active_leads} active
                    </span>
                  ) : null}
                </header>
                {metricsError ? (
                  <p className="mt-3 text-sm text-red-600">{metricsError}</p>
                ) : !activeMetrics ? (
                  <p className="mt-3 text-sm text-slate-500">No metrics yet.</p>
                ) : (
                  <dl className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                    <Stat label="Total" value={String(activeMetrics.total_leads)} />
                    <Stat label="Active" value={String(activeMetrics.active_leads)} />
                    <Stat
                      label="Conversion"
                      value={formatPercent(activeMetrics.conversion_rate)}
                      hint={`${activeMetrics.converted} converted`}
                    />
                    <Stat
                      label="Loss"
                      value={formatPercent(activeMetrics.loss_rate)}
                      hint={`${activeMetrics.lost} lost`}
                    />
                  </dl>
                )}
              </Card>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a workflow to view its definition.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }): JSX.Element {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-xl font-bold text-slate-900">{value}</dd>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
