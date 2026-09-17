'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import {
  LayoutDashboard, Target, Calendar, Trophy, Settings,
  Plus, Menu, LogOut, X,
} from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { isNavActive } from '@/lib/nav';

/** The three destinations that earn a permanent slot, plus the More menu. */
const BAR = [
  { icon: LayoutDashboard, label: 'Home',        href: '/home' },
  { icon: Calendar,        label: 'Calendar',    href: '/calendar' },
  { icon: Trophy,          label: 'Progression', href: '/progress' },
];

/** Secondary destinations — one tap away, never unreachable. */
const SHEET = [
  { icon: Target,   label: 'Goals',    href: '/goals',   hint: 'Every goal, active and finished' },
  { icon: Settings, label: 'Settings', href: '/profile', hint: 'Profile, appearance, account' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const setShowCreateGoal = useGoalStore(s => s.setShowCreateGoal);
  const { user } = useUser();
  const { signOut } = useClerk();
  const [more, setMore] = useState(false);

  // Navigating away closes the sheet, so it never survives into the next page.
  useEffect(() => { setMore(false); }, [pathname]);

  // While the sheet is open it owns the screen: Escape closes it, and the page
  // behind it does not scroll under the fingers.
  useEffect(() => {
    if (!more) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMore(false); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [more]);

  // The More tab lights up whenever the page you are on lives inside it.
  const moreActive = SHEET.some(i => isNavActive(pathname, i.href));

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 bg-card border-t border-line z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch justify-around px-1 pt-1 pb-1">
          {BAR.slice(0, 2).map(item => (
            <Tab key={item.href} {...item} active={isNavActive(pathname, item.href)} />
          ))}

          <button
            onClick={() => setShowCreateGoal(true)}
            aria-label="New Goal"
            className="flex flex-col items-center justify-center w-14 h-14 -mt-5 flex-shrink-0 rounded-full bg-[var(--brand)] shadow-lg shadow-[var(--brand)]/40 active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6 text-black" />
          </button>

          {BAR.slice(2).map(item => (
            <Tab key={item.href} {...item} active={isNavActive(pathname, item.href)} />
          ))}

          <Tab
            icon={Menu}
            label="More"
            active={moreActive || more}
            onClick={() => setMore(o => !o)}
            expanded={more}
          />
        </div>
      </nav>

      {more && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            aria-label="Close menu"
            onClick={() => setMore(false)}
            className="absolute inset-0 bg-black/70 animate-fade-in"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="More"
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto thin-scroll rounded-t-2xl border-t border-line-strong bg-card animate-slide-up"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            <div className="px-4 pt-3 pb-1">
              <span className="block h-1 w-10 rounded-full bg-line-strong mx-auto" />
              <button
                onClick={() => setMore(false)}
                aria-label="Close menu"
                className="absolute right-3 top-3 p-2 rounded-lg text-muted hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 pt-3 space-y-1">
              {SHEET.map(item => {
                const active = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMore(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
                      active ? 'bg-brand/10 text-brand' : 'text-fg active:bg-elevated'
                    }`}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-none">{item.label}</span>
                      <span className="block text-xs text-muted mt-1 truncate">{item.hint}</span>
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-3 pt-3 px-4 border-t border-line flex items-center gap-3">
              {user?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.imageUrl} alt="" className="h-10 w-10 rounded-full object-cover bg-elevated border border-line flex-shrink-0" />
              ) : (
                <span className="h-10 w-10 rounded-full bg-brand/10 border border-brand/25 flex items-center justify-center text-sm font-semibold text-brand flex-shrink-0">
                  {(user?.firstName?.[0] || user?.username?.[0] || '?').toUpperCase()}
                </span>
              )}
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-fg truncate leading-none">
                  {user?.fullName || user?.username || '—'}
                </span>
                <span className="block text-xs text-muted truncate mt-1">
                  {user?.primaryEmailAddress?.emailAddress || '—'}
                </span>
              </span>
              <button
                onClick={() => signOut()}
                aria-label="Sign out"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line text-sm text-red-400 flex-shrink-0"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Tab({
  icon: Icon, label, href, active, onClick, expanded,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  active: boolean;
  onClick?: () => void;
  expanded?: boolean;
}) {
  const content = (
    <span className="flex flex-col items-center gap-0.5 py-1 px-1 relative w-full">
      <Icon
        className={`h-5 w-5 transition-colors ${active ? 'text-[var(--brand)] nav-icon-lit' : 'text-muted'}`}
      />
      <span className={`text-[11px] font-medium transition-colors ${active ? 'text-[var(--brand)]' : 'text-muted'}`}>
        {label}
      </span>
      {/* A lit bar rather than a dot — the dot read as a stray pixel against
          the rest of the interface, which is built out of glowing edges. */}
      <span
        aria-hidden
        className={`nav-indicator absolute -bottom-1 left-1/2 -translate-x-1/2 h-[3px] rounded-full transition-all duration-200 ${
          active ? 'w-6 opacity-100' : 'w-0 opacity-0'
        }`}
      />
    </span>
  );

  const cls = 'flex-1 min-w-0 flex justify-center items-center active:opacity-70';

  if (href) {
    return (
      <Link href={href} aria-current={active ? 'page' : undefined} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button onClick={onClick} aria-expanded={expanded} className={cls}>
      {content}
    </button>
  );
}
