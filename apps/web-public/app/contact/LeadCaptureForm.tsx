'use client';

import { useState, type FormEvent } from 'react';

import { Button, TextField } from '@kiana/design-system';

import { createLead } from '../../lib/api';

interface FieldErrors {
  full_name?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+()\-\s\d]{7,20}$/;

/** Public lead-capture form. Anonymous submission → POST /api/leads. */
export function LeadCaptureForm(): JSX.Element {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  function validate(): FieldErrors {
    const issues: FieldErrors = {};
    if (!fullName.trim()) {
      issues.full_name = 'Please tell us your name.';
    }
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedEmail && !trimmedPhone) {
      issues.email = 'Provide an email or phone so we can reach you.';
    }
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      issues.email = 'Enter a valid email address.';
    }
    if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
      issues.phone = 'Enter a valid phone number.';
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
    if (Object.keys(fieldErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const lead = await createLead({
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        source: 'web_form',
      });
      setSubmittedId(lead.id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'We could not record your enquiry. Please try again.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedId) {
    return (
      <div className="rounded-2xl bg-white shadow-md border border-slate-200 p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Thanks — we have your details.</h2>
        <p className="mt-3 text-slate-600">
          Reference&nbsp;<code className="font-mono text-xs text-slate-500">{submittedId}</code>.
          A presales specialist will reach out within one business day.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-md border border-slate-200 p-8">
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
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
            What are you looking for?
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
              Optional — bedrooms, locality, budget, ideal move-in date.
            </p>
          )}
        </div>

        {formError ? (
          <div
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
          >
            {formError}
          </div>
        ) : null}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Sending…' : 'Talk to a specialist'}
        </Button>
      </form>
    </div>
  );
}
