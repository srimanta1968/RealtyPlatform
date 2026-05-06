import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button, Card, TextField } from '@kiana/design-system';
import type { LeadSource, LeadSourceSummary } from '@kiana/contracts';

import { createLead, fetchLeadSources } from '../lib/api.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+()\-\s\d]{7,20}$/;

const SOURCE_LABEL: Record<LeadSource, string> = {
  web_form: 'Web form',
  whatsapp: 'WhatsApp',
  phone: 'Phone',
  referral: 'Referral',
  walk_in: 'Walk-in',
  campaign: 'Marketing campaign',
  broker: 'Broker',
  import: 'Imported',
};

interface FieldErrors {
  full_name?: string;
  email?: string;
  phone?: string;
  budget?: string;
  notes?: string;
}

/** Operator-side lead-capture form for walk-in / phone / broker / referral leads. */
export function CreateLeadPage(): JSX.Element {
  const navigate = useNavigate();
  const [sources, setSources] = useState<LeadSourceSummary | null>(null);
  const [sourcesError, setSourcesError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState<LeadSource>('walk_in');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchLeadSources()
      .then((next) => {
        if (!cancelled) setSources(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSourcesError(err instanceof Error ? err.message : 'Failed to load source catalog.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function validate(): FieldErrors {
    const issues: FieldErrors = {};
    if (!fullName.trim()) {
      issues.full_name = 'Please enter the lead name.';
    }
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedEmail && !trimmedPhone) {
      issues.email = 'Capture either email or phone so we can follow up.';
    }
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      issues.email = 'Enter a valid email address.';
    }
    if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
      issues.phone = 'Enter a valid phone number.';
    }
    const minN = budgetMin ? Number(budgetMin) : null;
    const maxN = budgetMax ? Number(budgetMax) : null;
    if (minN !== null && !Number.isFinite(minN)) {
      issues.budget = 'Budget min must be a number.';
    }
    if (maxN !== null && !Number.isFinite(maxN)) {
      issues.budget = 'Budget max must be a number.';
    }
    if (minN !== null && maxN !== null && minN > maxN) {
      issues.budget = 'Budget min cannot exceed budget max.';
    }
    if (notes.length > 2000) {
      issues.notes = 'Please keep notes under 2000 characters.';
    }
    return issues;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);
    const fieldErrors = validate();
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    try {
      const lead = await createLead({
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        source,
        budget_min_minor:
          budgetMin && Number.isFinite(Number(budgetMin))
            ? Math.round(Number(budgetMin) * 100)
            : undefined,
        budget_max_minor:
          budgetMax && Number.isFinite(Number(budgetMax))
            ? Math.round(Number(budgetMax) * 100)
            : undefined,
        notes: notes.trim() || undefined,
      });
      navigate(`/leads/${lead.id}`, { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not capture the lead. Try again.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const sourceOptions = sources ? sources.all_sources : (Object.keys(SOURCE_LABEL) as LeadSource[]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/leads" className="text-sm text-kiana-primary hover:underline">
        ← Back to inbox
      </Link>
      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New lead</h1>
        <p className="mt-1 text-sm text-slate-600">
          Operator-side capture. Source defaults to walk-in — adjust when capturing on behalf of a
          broker, phone enquiry, or imported list.
        </p>
      </header>

      {sourcesError ? (
        <p className="mb-4 text-xs text-amber-700">
          Couldn&apos;t load the source catalog ({sourcesError}). Falling back to the static list.
        </p>
      ) : null}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <TextField
            label="Full name"
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors.full_name}
            required
          />
          <TextField
            label="Email"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            hint="Either email or phone is required."
          />
          <TextField
            label="Phone"
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
          />
          <div>
            <label htmlFor="source" className="block text-sm font-medium text-slate-700">
              Source
            </label>
            <select
              id="source"
              name="source"
              value={source}
              onChange={(e) => setSource(e.target.value as LeadSource)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-kiana-primary focus:outline-none focus:ring-2 focus:ring-kiana-primary/30"
            >
              {sourceOptions.map((value) => (
                <option key={value} value={value}>
                  {SOURCE_LABEL[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Budget min (₹)"
              id="budget_min"
              name="budget_min"
              type="number"
              inputMode="numeric"
              min={0}
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              hint="Optional — full rupees, not paise."
            />
            <TextField
              label="Budget max (₹)"
              id="budget_max"
              name="budget_max"
              type="number"
              inputMode="numeric"
              min={0}
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              error={errors.budget}
            />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={2000}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-kiana-primary focus:outline-none focus:ring-2 focus:ring-kiana-primary/30"
            />
            {errors.notes ? (
              <p className="mt-1 text-xs text-red-600">{errors.notes}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                Optional — bedrooms, locality, broker context, anything useful for follow-up.
              </p>
            )}
          </div>
          {formError ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {formError}
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Capturing…' : 'Capture lead'}
            </Button>
            <Link
              to="/leads"
              className="text-sm font-medium text-slate-600 hover:text-kiana-primary"
            >
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
