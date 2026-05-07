interface Stat {
  label: string;
  value: string;
  caption: string;
}

const STATS: Stat[] = [
  { value: '4', label: 'Locations', caption: 'Lonavala, Alibaug, Karjat & Goa' },
  { value: '120+', label: 'Curated listings', caption: 'Verified, RERA-checked, ready to visit' },
  { value: '30 min', label: 'Response SLA', caption: 'Presales follows up in business hours' },
  { value: 'Zero', label: 'Brokerage on first visit', caption: 'See the property before you decide' },
];

/**
 * Trust strip rendered just below the hero. Four numbers that signal
 * scale + diligence + speed-of-response — the three things weekend-home
 * buyers actually care about. Numbers are static for Phase-1; lift onto
 * a /api/marketing/stats feed once analytics-service ships.
 */
export function StatStrip(): JSX.Element {
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-white p-6 text-center">
            <div className="text-3xl font-bold text-kiana-primary md:text-4xl">{stat.value}</div>
            <div className="mt-1 text-sm font-semibold uppercase tracking-wider text-slate-700">
              {stat.label}
            </div>
            <p className="mt-2 text-xs text-slate-500">{stat.caption}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
