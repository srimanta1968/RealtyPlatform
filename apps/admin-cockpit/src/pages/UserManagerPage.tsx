import { useState } from 'react';

import type { StaffInvite, StaffInviteRequest } from '@kiana/contracts';

import { inviteStaff } from '../lib/api.js';

type StaffRole = StaffInviteRequest['role'];
const STAFF_ROLES: StaffRole[] = ['admin', 'presales', 'field_agent', 'marketer'];
const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  presales: 'Presales',
  field_agent: 'Field agent',
  marketer: 'Marketer',
};

interface IssuedInviteRow {
  invite: StaffInvite;
  token?: string;
}

/**
 * Admin User Manager — currently exposes the staff-invite workflow
 * (Phase-1 Task #22). Listing the live user roster lands when
 * GET /api/users ships; for now the page surfaces the invite form +
 * a session-local list of just-issued invites so admins can copy the
 * dev token into a manual onboarding flow.
 */
export function UserManagerPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<StaffRole>('presales');
  const [issued, setIssued] = useState<IssuedInviteRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleInvite(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await inviteStaff({
        email: email.trim(),
        role,
        ...(fullName.trim() ? { full_name: fullName.trim() } : {}),
      });
      setIssued((prev) => [{ invite: result.invite, token: result.token }, ...prev]);
      setEmail('');
      setFullName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue invite.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900">Team</h1>
        <p className="mt-1 text-sm text-slate-500">
          Invite presales, field, and marketing staff. Roster + role management lands alongside
          GET /api/users in Phase-2.
        </p>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <h2 className="mt-8 text-lg font-semibold text-slate-900">Recent invites</h2>
        {issued.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            No invites issued in this session yet.
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Token</th>
                </tr>
              </thead>
              <tbody>
                {issued.map((row) => (
                  <tr key={row.invite.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-900">{row.invite.email}</td>
                    <td className="px-4 py-3 capitalize text-slate-700">
                      {ROLE_LABEL[row.invite.role] ?? row.invite.role}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(row.invite.expires_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {row.token ? (
                        <button
                          type="button"
                          onClick={() => void copyToken(row.token!)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          Copy token
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">(emailed only)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Invite staff</h2>
        <p className="mt-1 text-xs text-slate-500">
          One-shot token, 72h TTL. Customer accounts self-register — pick a staff role here.
        </p>
        <form onSubmit={(e) => void handleInvite(e)} className="mt-4 space-y-3 text-sm">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Full name (optional)</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            >
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r] ?? r}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-kiana-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Sending invite…' : 'Send invite'}
          </button>
        </form>
      </aside>
    </div>
  );
}

async function copyToken(token: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(token);
  } catch {
    window.prompt('Copy this invite token', token);
  }
}
