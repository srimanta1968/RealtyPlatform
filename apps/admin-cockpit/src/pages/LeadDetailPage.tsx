import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Card } from '@kiana/design-system';
import type { LeadRecord, LeadStage } from '@kiana/contracts';

import { fetchLead, updateLeadStage } from '../lib/api.js';

const STAGE_OPTIONS: ReadonlyArray<{ value: LeadStage; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'visit_scheduled', label: 'Visit scheduled' },
  { value: 'visit_completed', label: 'Visit completed' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];

/** Detail view for a single captured lead — operators can advance the stage inline. */
export function LeadDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<LeadRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingStage, setSavingStage] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const leadId = id;
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const next = await fetchLead(leadId);
        if (!cancelled) setLead(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Lead not found.');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleStageChange(next: LeadStage): Promise<void> {
    if (!lead || next === lead.stage) return;
    setSavingStage(true);
    setStageError(null);
    try {
      const updated = await updateLeadStage(lead.id, next);
      setLead(updated);
    } catch (err) {
      setStageError(err instanceof Error ? err.message : 'Could not update stage.');
    } finally {
      setSavingStage(false);
    }
  }

  if (error) {
    return (
      <div>
        <Link to="/leads" className="text-sm text-kiana-primary hover:underline">
          ← Back to inbox
        </Link>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!lead) {
    return <p className="text-sm text-slate-500">Loading lead…</p>;
  }

  const captured = new Date(lead.created_at).toLocaleString();
  const updated = new Date(lead.updated_at).toLocaleString();

  return (
    <div>
      <Link to="/leads" className="text-sm text-kiana-primary hover:underline">
        ← Back to inbox
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{lead.full_name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Captured {captured} · last updated {updated}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Contact</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Email" value={lead.email} />
            <Row label="Phone" value={lead.phone} />
          </dl>
        </Card>
        <Card>
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Pipeline</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <Row label="Source" value={lead.source} />
            <div className="flex items-baseline gap-3">
              <dt className="w-24 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">
                Stage
              </dt>
              <dd className="flex flex-1 flex-col gap-1">
                <select
                  value={lead.stage}
                  disabled={savingStage}
                  onChange={(e) => void handleStageChange(e.target.value as LeadStage)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-kiana-primary focus:outline-none focus:ring-2 focus:ring-kiana-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Lead stage"
                >
                  {STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {savingStage ? <p className="text-xs text-slate-500">Saving…</p> : null}
                {stageError ? <p className="text-xs text-red-600">{stageError}</p> : null}
              </dd>
            </div>
            <Row
              label="Budget"
              value={formatBudget(lead.budget_min_minor, lead.budget_max_minor)}
            />
          </dl>
        </Card>
        <Card className="md:col-span-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
            {lead.notes ?? <span className="text-slate-400">No notes captured.</span>}
          </p>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }): JSX.Element {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-24 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="text-sm text-slate-900">
        {value ?? <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}

function formatBudget(minMinor: number | null, maxMinor: number | null): string | null {
  if (minMinor === null && maxMinor === null) return null;
  const fmt = (minor: number | null): string =>
    minor === null
      ? '—'
      : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(minor / 100);
  return `₹ ${fmt(minMinor)} – ₹ ${fmt(maxMinor)}`;
}
