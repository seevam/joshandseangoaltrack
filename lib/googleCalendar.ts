'use client';

import type { Interval } from './schedule';

/**
 * Reads when the user is busy today from their Google Calendar.
 *
 * Scope is `calendar.freebusy` — "see your availability", not "see your
 * events". The app learns that 8:00–16:00 is taken, never that it is "Biology
 * with Mr Harris". It is the least Google will grant for this, and the
 * consent screen says so, which matters for a teenage user base.
 *
 * Runs entirely in the browser with Google Identity Services: no server
 * route, no stored refresh token. The access token lives for about an hour in
 * sessionStorage and is thrown away when the tab closes; reconnecting is one
 * click and does not re-prompt once consent has been given.
 *
 * Needs NEXT_PUBLIC_GOOGLE_CLIENT_ID. Without it `isConfigured()` is false and
 * the UI does not offer the feature at all rather than offering a broken one.
 */

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const SCOPE = 'https://www.googleapis.com/auth/calendar.freebusy';
const TOKEN_KEY = 'gq_gcal_token';

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

/**
 * Busy intervals on the primary calendar between two moments.
 * Throws 'expired' when the token has lapsed so the UI can offer to reconnect.
 */
export async function fetchBusy(from: number, to: number): Promise<Interval[]> {
  const t = readToken();
  if (!t) throw new Error('expired');

  const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t.value}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timeMin: new Date(from).toISOString(),
      timeMax: new Date(to).toISOString(),
      items: [{ id: 'primary' }],
    }),
  });

  if (res.status === 401) {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
    throw new Error('expired');
  }
  if (!res.ok) throw new Error(`Google Calendar returned ${res.status}.`);

  const data = await res.json() as {
    calendars?: Record<string, { busy?: { start: string; end: string }[]; errors?: unknown[] }>;
  };
  const busy = data.calendars?.primary?.busy ?? [];
  return busy
    .map(b => ({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() }))
    .filter(i => Number.isFinite(i.start) && Number.isFinite(i.end) && i.end > i.start);
}
