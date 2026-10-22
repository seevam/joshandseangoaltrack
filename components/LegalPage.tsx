import Link from 'next/link';

/**
 * Shared shell for the public legal pages. These are linked from Google's
 * OAuth consent screen, so they must load for signed-out visitors (see the
 * public routes in middleware.ts) and read plainly without the app around them.
 */

/** Who to write to about privacy or these terms. Shown on both pages. */
export const CONTACT_EMAIL = 'REPLACE_WITH_CONTACT_EMAIL@example.com';
export const APP_NAME = 'Goal Quest';
export const LAST_UPDATED = 'October 22, 2026';

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-5 py-10 sm:py-14">
        <Link href="/" className="text-sm text-muted hover:text-fg">← {APP_NAME}</Link>
        <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-fg mt-6">{title}</h1>
        <p className="text-sm text-muted mt-2">Last updated {LAST_UPDATED}</p>
        <div className="legal mt-8 space-y-6 text-sm leading-relaxed text-muted">{children}</div>
        <footer className="mt-12 pt-6 border-t border-line text-xs text-muted flex gap-4">
          <Link href="/privacy" className="hover:text-fg">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-fg">Terms of Service</Link>
        </footer>
      </div>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-base font-semibold text-fg">{heading}</h2>
      {children}
    </section>
  );
}
