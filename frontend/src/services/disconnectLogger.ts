// Centralized logging for "why was the user disconnected?" diagnostics.
//
// Users were reporting being booted out of the app mid-typing. To find the
// root cause we log every event that could contribute to a disconnect:
// 401 responses, JWT-expiry decisions, inactivity warnings, refresh
// outcomes, manual logout calls. Each event is mirrored to the browser
// console (prefixed [AUTH]) and beaconed to the backend so it shows up
// in the server logs even if the tab closes.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type DisconnectReason =
  | 'response_401_token_expired'      // 401 received AND local JWT exp passed → forced logout
  | 'response_401_token_still_valid'  // 401 received but local JWT not yet expired → no logout
  | 'response_401_on_refresh'         // 401 from /auth/refresh — silently swallowed
  | 'inactivity_warning_shown'        // 5-min warning popup
  | 'inactivity_logout'               // 1-hour idle → forced logout
  | 'manual_logout'                   // user clicked logout
  | 'refresh_attempt'
  | 'refresh_success'
  | 'refresh_failed'
  | 'response_403';

interface BeaconPayload {
  reason: DisconnectReason;
  detail?: string;
  url?: string;
  idleMs?: number;
  lastActivityAt?: string;
  [key: string]: any;
}

function decodeToken(): { userId?: number; email?: string; exp?: number; expAtIso?: string } {
  try {
    const token = localStorage.getItem('token');
    if (!token) return {};
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      userId: payload?.userId,
      email: payload?.email,
      exp: payload?.exp,
      expAtIso: payload?.exp ? new Date(payload.exp * 1000).toISOString() : undefined,
    };
  } catch {
    return {};
  }
}

export function logDisconnect(reason: DisconnectReason, extra: Partial<BeaconPayload> = {}) {
  const tok = decodeToken();
  const payload = {
    reason,
    path: window.location.pathname,
    tokenExpAt: tok.expAtIso,
    userId: tok.userId,
    email: tok.email,
    timestamp: new Date().toISOString(),
    ...extra,
  };

  // Console (console.warn so it stays visible across log levels)
  // eslint-disable-next-line no-console
  console.warn('[AUTH]', reason, payload);

  // Best-effort beacon to backend. Use a Blob so Content-Type is JSON
  // and Express's json parser picks it up. sendBeacon is fire-and-forget
  // and works even during page unload — exactly what we need before a
  // forced redirect to /login.
  try {
    const body = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = `${API_URL}/auth/log-disconnect`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, body);
    } else {
      // Fallback for environments without sendBeacon
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // never throw from the logger
  }
}
