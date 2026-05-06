import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@kiana/ui-kit';
import type { PipelineColumn, PipelineKanban } from '@kiana/sdk';

import { fetchPipeline } from '../lib/api.js';

const STAGE_LABEL: Record<string, string> = {
  new: 'New',
  qualified: 'Qualified',
  contacted: 'Contacted',
  visit_scheduled: 'Visit scheduled',
  visit_completed: 'Visit completed',
  negotiation: 'Negotiation',
  converted: 'Converted',
  lost: 'Lost',
};

const STAGE_ACCENT: Record<string, string> = {
  new: 'border-sky-300',
  qualified: 'border-emerald-300',
  contacted: 'border-amber-300',
  visit_scheduled: 'border-indigo-300',
  visit_completed: 'border-violet-300',
  negotiation: 'border-orange-300',
  converted: 'border-green-400',
  lost: 'border-slate-300',
};

/**
 * Kanban view of the lead pipeline. Each column is a LeadStage with the
 * live count + the most-recent N cards. The "My pipeline" toggle scopes
 * the read to leads owned by the current user (Phase-1 Task #30 owner
 * filter); the per-stage card limit is fixed at 25 to keep the
 * payload small.
 */
export function PipelinePage(): JSX.Element {
  const { user } = useAuth();
  const [kanban, setKanban] = useState<PipelineKanban | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<'all' | 'mine'>('all');

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const result = await fetchPipeline({
          ...(scope === 'mine' && user?.id ? { owner_id: user.id } : {}),
          per_stage_limit: 25,
        });
        if (!cancelled) setKanban(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load pipeline.');
      }
    }
    setKanban(null);
    void load();
    return () => {
      cancelled = true;
    };
  }, [scope, user?.id]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pipeline</h1>
          <p className="text-sm text-slate-500">
            {kanban ? `${kanban.total_leads} live leads` : 'Loading…'}
          </p>
        </div>
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 text-sm">
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`rounded-full px-4 py-1 ${
              scope === 'all' ? 'bg-kiana-primary text-white' : 'text-slate-700'
            }`}
          >
            Everyone
          </button>
          <button
            type="button"
            onClick={() => setScope('mine')}
            disabled={!user?.id}
            className={`rounded-full px-4 py-1 ${
              scope === 'mine' ? 'bg-kiana-primary text-white' : 'text-slate-700'
            } disabled:opacity-50`}
          >
            My pipeline
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        <div className="flex gap-4 pb-4">
          {(kanban?.columns ?? []).map((column) => (
            <KanbanColumn key={column.stage} column={column} />
          ))}
          {kanban === null && !error ? (
            <div className="text-sm text-slate-400">Hydrating columns…</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ column }: { column: PipelineColumn }): JSX.Element {
  return (
    <div
      className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-white shadow-sm ${
        STAGE_ACCENT[column.stage] ?? 'border-slate-200'
      }`}
    >
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <span className="font-semibold text-slate-900">
          {STAGE_LABEL[column.stage] ?? column.stage}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {column.count}
        </span>
      </header>
      <ol className="flex max-h-[640px] flex-col gap-2 overflow-y-auto px-3 py-3">
        {column.cards.length === 0 ? (
          <li className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
            No cards in this stage
          </li>
        ) : (
          column.cards.map((card) => (
            <li key={card.id}>
              <Link
                to={`/leads/${card.id}`}
                className="block rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:bg-white"
              >
                <div className="font-medium text-slate-900">{card.full_name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {card.email ?? '(no email)'} · {card.source}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  {new Date(card.updated_at).toLocaleString()}
                </div>
              </Link>
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
