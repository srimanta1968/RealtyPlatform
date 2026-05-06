import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@kiana/design-system';
import type { LeadRecord, LeadSource, LeadSourceSummary } from '@kiana/contracts';

import { fetchLeadSources, listLeads } from '../lib/api.js';

const SOURCE_LABEL: Record<LeadSource, string> = {
  web_form: 'Web form',
  whatsapp: 'WhatsApp',
  phone: 'Phone',
  referral: 'Referral',
  walk_in: 'Walk-in',
  campaign: 'Campaign',
  broker: 'Broker',
  import: 'Imported',
};

const STAGE_BADGE: Record<string, string> = {
  new: 'bg-sky-100 text-sky-800',
  qualified: 'bg-emerald-100 text-emerald-800',
  contacted: 'bg-amber-100 text-amber-800',
  visit_scheduled: 'bg-indigo-100 text-indigo-800',
  visit_completed: 'bg-violet-100 text-violet-800',
  negotiation: 'bg-orange-100 text-orange-800',
  converted: 'bg-green-100 text-green-800',
  lost: 'bg-slate-200 text-slate-700',
};

/** Operator-facing list of every captured lead with quick filtering by source. */
export function LeadInboxPage(): JSX.Element {
  const [leads, setLeads] = useState<LeadRecord[] | null>(null);
  const [summary, setSummary] = useState<LeadSourceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'all'>('all');

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const [list, sources] = await Promise.all([listLeads(), fetchLeadSources()]);
        if (cancelled) return;
        setLeads(list);
        setSummary(sources);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load leads.');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!leads) return null;
    return sourceFilter === 'all' ? leads : leads.filter((lead) => lead.source === sourceFilter);
  }, [leads, sourceFilter]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!leads || !summary) {
    return <p className="text-sm text-slate-500">Loading lead inbox…</p>;
  }

  const countFor = (source: LeadSource): number =>
    summary.sources.find((row) => row.source === source)?.count ?? 0;

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lead inbox</h1>
          <p className="mt-1 text-sm text-slate-600">
            {leads.length} captured {leads.length === 1 ? 'lead' : 'leads'} · pipeline triage.
          </p>
        </div>
        <Link to="/leads/new">
          <Button type="button" size="sm">
            + New lead
          </Button>
        </Link>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSourceFilter('all')}
          className={[
            'rounded-full px-3 py-1 text-xs font-medium transition',
            sourceFilter === 'all'
              ? 'bg-kiana-primary text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-kiana-primary/40',
          ].join(' ')}
        >
          All · {leads.length}
        </button>
        {summary.all_sources.map((source) => (
          <button
            key={source}
            type="button"
            onClick={() => setSourceFilter(source)}
            className={[
              'rounded-full px-3 py-1 text-xs font-medium transition',
              sourceFilter === source
                ? 'bg-kiana-primary text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-kiana-primary/40',
            ].join(' ')}
          >
            {SOURCE_LABEL[source]} · {countFor(source)}
          </button>
        ))}
      </div>

      {filtered && filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
          No leads match this filter yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Captured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered?.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link to={`/leads/${lead.id}`} className="hover:text-kiana-primary">
                      {lead.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {lead.email ?? lead.phone ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{SOURCE_LABEL[lead.source]}</td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        STAGE_BADGE[lead.stage] ?? 'bg-slate-100 text-slate-700',
                      ].join(' ')}
                    >
                      {lead.stage.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(lead.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
