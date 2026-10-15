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

interface TokenResponse { access_token?: string; expires_in?: number; error?: string }
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
  await loadGis();
  await new Promise<void>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: r => {
        if (r.error || !r.access_token) {
          reject(new Error(r.error === 'access_denied' ? 'Access was not granted.' : 'Google did not return access.'));
          return;
        }
        try {
          sessionStorage.setItem(TOKEN_KEY, JSON.stringify({
            value: r.access_token,
            expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000,
          } satisfies StoredToken));
        } catch { /* private mode: the token still works for this call */ }
        resolve();
      },
      // Closing the pop-up lands here rather than in `callback`.
      error_callback: e => reject(new Error(e.type === 'popup_closed' ? 'The Google window was closed.' : 'Could not reach Google.')),
    });
    client.requestAccessToken({ prompt: '' });
  });
}

export function disconnect() {
  const t = readToken();
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

  if (res.status === 401 || res.status === 403) {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
    throw new Error('expired');
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
