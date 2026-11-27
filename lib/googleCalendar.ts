'use client';

import type { Interval } from './schedule';

/**
 * Reads the user's day from their Google Calendar.
 *
 * Scope is `calendar.events.readonly`: the app sees today's events — their
 * times and titles — and can never change them. Titles are what let a
 * suggestion be placed sensibly ("20 minutes before Football practice") and
 * let the coach reason about the day; nothing is written back and nothing is
 * stored on the server.
 *
 * Runs entirely in the browser with Google Identity Services: no server
 * route, no stored refresh token. The access token lives for about an hour in
 * sessionStorage and is thrown away when the tab closes; reconnecting is one
 * click and does not re-prompt once consent has been given.
 *
 * Needs NEXT_PUBLIC_GOOGLE_CLIENT_ID. Without it `isConfigured()` is false and
 * the UI says the feature is not set up rather than offering a broken button.
 */

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly';
// Bumped with the scope change, so a token granted for the old, narrower
// scope is not reused for event reads it cannot perform.
const TOKEN_KEY = 'gq_gcal_token_v2';

interface StoredToken { value: string; expiresAt: number }

interface TokenResponse { access_token?: string; expires_in?: number; error?: string; scope?: string }
interface TokenClient { requestAccessToken: (o?: { prompt?: string }) => void }
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string;
            scope: string;
            callback: (r: TokenResponse) => void;
            error_callback?: (e: { type?: string; message?: string }) => void;
          }) => TokenClient;
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

export function isConfigured(): boolean {
  return CLIENT_ID.length > 0;
}

function readToken(): StoredToken | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as StoredToken;
    // A minute's margin so a request never goes out on a token about to lapse.
    return t.value && t.expiresAt - 60000 > Date.now() ? t : null;
  } catch { return null; }
}

export function isConnected(): boolean {
  return readToken() !== null;
}

/*
 * Whether this browser has connected before. The token itself lives only an
 * hour in one tab, so without this a new tab or an expired token looked like
 * a user who had never connected: the full pitch again, as if the feature had
 * forgotten them. Now it offers a one-click "Reconnect" instead.
 */
const SEEN_KEY = 'gq_gcal_connected_before';
export function connectedBefore(): boolean {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}
function rememberConnected(on: boolean) {
  try { if (on) localStorage.setItem(SEEN_KEY, '1'); else localStorage.removeItem(SEEN_KEY); } catch { /* ignore */ }
}

/**
 * Loads Google's sign-in script ahead of the click. Loading it inside the
 * click handler meant the pop-up opened after an async wait, outside the
 * click's "user gesture" — which Safari (and Chrome after a delay) treat as an
 * unrequested pop-up and silently block.
 */
export function preload(): void {
  if (isConfigured() && typeof window !== 'undefined') loadGis().catch(() => { /* reported on click */ });
}

let gisLoading: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoading) return gisLoading;
  gisLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { gisLoading = null; reject(new Error('Could not load Google sign-in.')); };
    document.head.appendChild(s);
  });
  return gisLoading;
}

/** Opens Google's consent pop-up. Resolves once a token is in hand. */
export async function connect(): Promise<void> {
  if (!isConfigured()) throw new Error('Google Calendar is not set up for this app yet.');
  // Only wait when the script isn't there yet: the pop-up must open in the
  // same turn as the click, or browsers count it as unrequested.
  if (!window.google?.accounts?.oauth2) await loadGis();
  await new Promise<void>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: r => {
        if (r.error || !r.access_token) {
          reject(new Error(r.error === 'access_denied' ? 'Access was not granted.' : 'Google did not return access.'));
          return;
        }
        // Google's consent screen lets people untick the calendar box and
        // still press Continue. The token then can't read events, and every
        // request after it failed with nothing shown.
        if (r.scope !== undefined && !r.scope.split(' ').includes(SCOPE)) {
          reject(new Error('Calendar access wasn\u2019t granted. Try again and leave the \u201cSee events\u201d box ticked on Google\u2019s screen.'));
          return;
        }
        rememberConnected(true);
        try {
          sessionStorage.setItem(TOKEN_KEY, JSON.stringify({
            value: r.access_token,
            expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000,
          } satisfies StoredToken));
        } catch { /* private mode: the token still works for this call */ }
        resolve();
      },
      // Closing the pop-up lands here rather than in `callback`.
      error_callback: e => reject(new Error(
        e.type === 'popup_closed' ? 'The Google window was closed.'
          : e.type === 'popup_failed_to_open' ? 'Your browser blocked the Google window. Allow pop-ups for this site and try again.'
            : 'Could not reach Google.',
      )),
    });
    client.requestAccessToken({ prompt: '' });
  });
}

export function disconnect() {
  const t = readToken();
  rememberConnected(false);
  try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  if (t && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(t.value);
}

export interface CalendarEvent extends Interval {
  title: string;
  /** All-day events (birthdays, holidays) are shown but never block time. */
  allDay: boolean;
}

/**
 * Events on the primary calendar between two moments, recurring ones expanded.
 * Throws 'expired' when the token has lapsed so the UI can offer to reconnect.
 */
export async function fetchEvents(from: number, to: number): Promise<CalendarEvent[]> {
  const t = readToken();
  if (!t) throw new Error('expired');

  const params = new URLSearchParams({
    timeMin: new Date(from).toISOString(),
    timeMax: new Date(to).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
    fields: 'items(summary,start,end,transparency,status)',
  });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${t.value}` },
  });

  if (res.status === 401) {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
    throw new Error('expired');
  }
  if (res.status === 403) {
    // 403 is not "logged out" — it was treated as such, so the real cause
    // (API off, permission missing) never reached the screen.
    const body = await res.json().catch(() => null) as { error?: { message?: string; errors?: { reason?: string }[]; details?: { reason?: string }[] } } | null;
    const reasons = [...(body?.error?.errors ?? []), ...(body?.error?.details ?? [])].map(x => x.reason ?? '').join(' ');
    const text = `${reasons} ${body?.error?.message ?? ''}`;
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
    if (/accessNotConfigured|SERVICE_DISABLED|has not been used|is disabled/i.test(text)) {
      throw new Error('The Google Calendar API isn\u2019t enabled in this app\u2019s Google Cloud project yet (APIs & Services \u2192 Library \u2192 Google Calendar API \u2192 Enable).');
    }
    if (/insufficient|SCOPE/i.test(text)) {
      throw new Error('Calendar access wasn\u2019t granted. Reconnect and leave the \u201cSee events\u201d box ticked.');
    }
    throw new Error(`Google refused the calendar request${body?.error?.message ? `: ${body.error.message}` : '.'}`);
  }
  if (!res.ok) throw new Error(`Google Calendar returned ${res.status}.`);

  const data = await res.json() as {
    items?: {
      summary?: string; status?: string; transparency?: string;
      start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string };
    }[];
  };
  return (data.items ?? [])
    .filter(e => e.status !== 'cancelled')
    .map(e => {
      const allDay = !e.start?.dateTime;
      const start = new Date(e.start?.dateTime ?? `${e.start?.date}T00:00:00`).getTime();
      const end = new Date(e.end?.dateTime ?? `${e.end?.date}T00:00:00`).getTime();
      // "Free" events (transparency: transparent) are treated like all-day
      // ones: visible context, never a block.
      return { start, end, title: e.summary?.trim() || 'Busy', allDay: allDay || e.transparency === 'transparent' };
    })
    .filter(e => Number.isFinite(e.start) && Number.isFinite(e.end) && e.end > e.start);
}

/** The intervals that actually block time. */
export function busyFrom(events: CalendarEvent[]): Interval[] {
  return events.filter(e => !e.allDay).map(({ start, end }) => ({ start, end }));
}
