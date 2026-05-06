import Link from 'next/link';

import { UserMenu } from '../components/UserMenu';

interface Feature {
  title: string;
  body: string;
}

const features: Feature[] = [
  {
    title: 'Inbound lead capture',
    body: 'Web, phone, and broker referrals — every lead lands in a structured workflow you can act on.',
  },
  {
    title: 'Site-visit operations',
    body: 'Field-team app and customer communication unified in one calm, sales-ready experience.',
  },
  {
    title: 'AI-native workflows',
    body: 'Automate the routine. Surface the conversion-critical moments. Keep the human touch intact.',
  },
];

export default function HomePage(): JSX.Element {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="bg-kiana-primary text-white">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Kiana Realty
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <UserMenu />
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-br from-kiana-primary to-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            A growth platform for resort-style realty.
          </h1>
          <p className="mt-6 text-lg text-slate-200 max-w-2xl mx-auto">
            CRM, site-visit operations, marketing automation, and AI-native workflows —
            engineered for the way Kiana sells.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/register"
              className="rounded-full bg-kiana-accent px-6 py-3 font-semibold text-slate-900 hover:opacity-90"
            >
              Create your account
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-white/40 px-6 py-3 font-semibold hover:bg-white/10"
            >
              Talk to a specialist
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 grid gap-8 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-slate-200 p-6 shadow-sm"
            >
              <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-slate-900">Ready to grow with Kiana?</h2>
          <p className="mt-4 text-slate-600">
            Register in seconds and start managing leads, workflows, and conversions.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-block rounded-full bg-kiana-primary px-6 py-3 font-semibold text-white hover:opacity-95"
          >
            Get started free
          </Link>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-300">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm flex flex-col md:flex-row md:justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Kiana Realty Growth Platform.</span>
          <span>Operated by Insignia.</span>
        </div>
      </footer>
    </main>
  );
}
