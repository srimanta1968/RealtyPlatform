import Link from 'next/link';

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '+919999999999';
const SCHEDULE_VISIT_URL =
  process.env.NEXT_PUBLIC_SCHEDULE_VISIT_URL ?? '/contact?intent=schedule_visit';
const BOOK_CONSULTATION_URL =
  process.env.NEXT_PUBLIC_BOOK_CONSULTATION_URL ?? '/contact?intent=consultation';

export interface CTAButtonsProps {
  /** Optional context appended to the WhatsApp prefilled message. */
  propertyTitle?: string;
  propertySlug?: string;
}

/**
 * Three Phase-1 CTAs (Phase-1-Trust-Launch.md §7):
 *   - WhatsApp click-to-chat (deep-links into wa.me with a prefill)
 *   - Schedule a site visit (anchored to /contact with an intent flag)
 *   - Book a consultation call (same /contact, different intent)
 *
 * Phone number + URLs come from NEXT_PUBLIC_* env so deployments can
 * swap targets without code changes.
 */
export function CTAButtons({ propertyTitle, propertySlug }: CTAButtonsProps): JSX.Element {
  const message = propertyTitle
    ? `Hi Kiana, I'm interested in ${propertyTitle}.`
    : 'Hi Kiana, I would like to know more about your properties.';
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
  const scheduleUrl = propertySlug
    ? `${SCHEDULE_VISIT_URL}&property=${encodeURIComponent(propertySlug)}`
    : SCHEDULE_VISIT_URL;
  const consultUrl = propertySlug
    ? `${BOOK_CONSULTATION_URL}&property=${encodeURIComponent(propertySlug)}`
    : BOOK_CONSULTATION_URL;

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-emerald-500 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-600"
      >
        Chat on WhatsApp
      </a>
      <Link
        href={scheduleUrl}
        className="rounded-full bg-kiana-primary px-6 py-3 text-center text-sm font-semibold text-white transition hover:opacity-95"
      >
        Schedule a site visit
      </Link>
      <Link
        href={consultUrl}
        className="rounded-full border border-slate-300 px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Book a consultation
      </Link>
    </div>
  );
}
