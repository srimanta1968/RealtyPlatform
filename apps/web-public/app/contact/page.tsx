import type { Metadata } from 'next';

import { LeadSourceSchema, type LeadSource } from '@kiana/contracts';

import { LeadCaptureForm } from './LeadCaptureForm';

export const metadata: Metadata = {
  title: 'Talk to Kiana · Lead capture',
  description:
    'Tell us what you are looking for and a Kiana presales specialist will reach out within one business day.',
};

interface ContactPageProps {
  /** Next.js App Router server search-param input. */
  searchParams?: Record<string, string | string[] | undefined>;
}

/** Parse `?source=` against the LeadSource enum; fall back to 'web_form'. */
function resolveSource(searchParams: ContactPageProps['searchParams']): LeadSource {
  const raw = searchParams?.source;
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const parsed = LeadSourceSchema.safeParse(candidate);
  return parsed.success ? parsed.data : 'web_form';
}

/** Server Component shell for the public lead-capture surface. */
export default function ContactPage({ searchParams }: ContactPageProps): JSX.Element {
  const initialSource = resolveSource(searchParams);
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Talk to Kiana</h1>
          <p className="mt-3 text-slate-600">
            Share what you are looking for. A presales specialist will follow up within one
            business day.
          </p>
        </header>
        <LeadCaptureForm initialSource={initialSource} />
      </div>
    </main>
  );
}
