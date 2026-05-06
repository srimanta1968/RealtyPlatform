import { useEffect, useMemo, useState } from 'react';

import type {
  PropertyCreateRequest,
  PropertyRecord,
  PropertyStatus,
  PropertyType,
} from '@kiana/contracts';

import {
  createProperty,
  listProperties,
  publishProperty,
  updateProperty,
} from '../lib/api.js';

const TYPES: PropertyType[] = ['villa', 'land', 'retreat', 'investment', 'apartment', 'farmhouse'];
const STATUSES: PropertyStatus[] = ['draft', 'published', 'hold', 'sold'];
const STATUS_BADGE: Record<PropertyStatus, string> = {
  draft: 'bg-slate-200 text-slate-700',
  published: 'bg-emerald-100 text-emerald-800',
  hold: 'bg-amber-100 text-amber-800',
  sold: 'bg-violet-100 text-violet-800',
};

interface CreateFormState {
  title: string;
  slug: string;
  type: PropertyType;
  location: string;
  priceMinCr: string;
  priceMaxCr: string;
  tags: string;
}

const EMPTY_FORM: CreateFormState = {
  title: '',
  slug: '',
  type: 'villa',
  location: '',
  priceMinCr: '',
  priceMaxCr: '',
  tags: '',
};

/**
 * Admin Property Manager — list every property (any status) with quick
 * publish controls plus a side-pane new-property form. Powers the
 * Phase-1 admin-cockpit Properties screen.
 */
export function PropertyManagerPage(): JSX.Element {
  const [properties, setProperties] = useState<PropertyRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | 'all'>('all');
  const [form, setForm] = useState<CreateFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload(): Promise<void> {
    try {
      const rows = await listProperties();
      setProperties(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load properties.');
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => {
    if (!properties) return null;
    return statusFilter === 'all'
      ? properties
      : properties.filter((p) => p.status === statusFilter);
  }, [properties, statusFilter]);

  async function handleCreate(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: PropertyCreateRequest = {
        title: form.title.trim(),
        slug: form.slug.trim().toLowerCase(),
        type: form.type,
        location: form.location.trim(),
        ...(form.priceMinCr
          ? { price_min_minor: Math.round(Number(form.priceMinCr) * 1_00_00_000_00) }
          : {}),
        ...(form.priceMaxCr
          ? { price_max_minor: Math.round(Number(form.priceMaxCr) * 1_00_00_000_00) }
          : {}),
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        media: [],
      };
      await createProperty(payload);
      setForm(EMPTY_FORM);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create property.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id: string, status: PropertyStatus): Promise<void> {
    setBusyId(id);
    try {
      await publishProperty(id, status);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleQuickRename(id: string, currentTitle: string): Promise<void> {
    const next = window.prompt('New title?', currentTitle);
    if (next === null || next.trim() === '' || next === currentTitle) return;
    setBusyId(id);
    try {
      await updateProperty(id, { title: next.trim() });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update property.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Properties</h1>
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`rounded-full px-3 py-1 ${
                statusFilter === 'all' ? 'bg-kiana-primary text-white' : 'bg-white text-slate-700 border'
              }`}
            >
              All
            </button>
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 capitalize ${
                  statusFilter === s ? 'bg-kiana-primary text-white' : 'bg-white text-slate-700 border'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered === null ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No properties match this filter yet.
                  </td>
                </tr>
              ) : (
                filtered.map((property) => (
                  <tr key={property.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{property.title}</div>
                      <div className="text-xs text-slate-500">{property.slug}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-700">{property.type}</td>
                    <td className="px-4 py-3 text-slate-700">{property.location}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[property.status]}`}
                      >
                        {property.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={property.status}
                          disabled={busyId === property.id}
                          onChange={(e) =>
                            void handleStatusChange(property.id, e.target.value as PropertyStatus)
                          }
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => void handleQuickRename(property.id, property.title)}
                          disabled={busyId === property.id}
                          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          Rename
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">New property</h2>
        <p className="mt-1 text-xs text-slate-500">
          Lands in DRAFT — promote via the status dropdown.
        </p>
        <form onSubmit={(e) => void handleCreate(e)} className="mt-4 space-y-3 text-sm">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Title</span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Slug (kebab-case)</span>
            <input
              required
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              placeholder="lonavala-hilltop-villa"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Type</span>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as PropertyType })}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 capitalize"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Location</span>
            <input
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              placeholder="Lonavala"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Min ₹ (Cr)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.priceMinCr}
                onChange={(e) => setForm({ ...form, priceMinCr: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Max ₹ (Cr)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.priceMaxCr}
                onChange={(e) => setForm({ ...form, priceMaxCr: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Tags (comma-separated)</span>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              placeholder="villa, lonavala"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-kiana-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Create draft property'}
          </button>
        </form>
      </aside>
    </div>
  );
}
