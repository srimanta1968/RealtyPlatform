import type { Metadata } from 'next';

import { LeadCaptureForm } from './LeadCaptureForm';

export const metadata: Metadata = {
  title: 'Talk to Kiana · Lead capture',
  description:
    'Tell us what you are looking for and a Kiana presales specialist will reach out within one business day.',
};

/** Server Component shell for the public lead-capture surface. */
export default function ContactPage(): JSX.Element {
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
        <LeadCaptureForm />
      </div>
    </main>
  );
}
