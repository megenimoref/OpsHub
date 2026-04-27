import { useEffect, useRef, useCallback } from 'react';
import { authService } from '../services/authService';
import { logDisconnect } from '../services/disconnectLogger';

// Policy: as long as the user is active, the session NEVER closes.
// If there is no activity for 4 hours → logout.
//
// History: this used to be 1 hour. Real users (e.g. אורנה, userId 13)
// were getting kicked out mid-task because reading a soldier's profile
// or briefly switching to another tab/app quietly racked up 60+ idle
// minutes — see error log entry on 2026-04-27 10:00:38 where idleMs
// was 3,740,937 (~62 min) on /battalion/soldier. Bumping to 4h fits a
// realistic work shift.
const TIMEOUT_MS = 4 * 60 * 60 * 1000;          // 4 hours of inactivity → logout
const WARNING_MS = TIMEOUT_MS - 5 * 60 * 1000;  // 5 minutes before logout → show warning

// Refresh the JWT eagerly on any activity if it has less than this many ms remaining.
// JWT lives 7d on the backend; refreshing 1h before expiry means an active user's
// token rolls forward continuously — they are never forced to re-login while working.
const REFRESH_THRESHOLD_MS = 60 * 60 * 1000;  // 1 hour before expiry

function getTokenExpiryMs(): number | null {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return null;
    return payload.exp * 1000 - Date.now();
  } catch {
    return null;
  }
}

interface Options {
  onWarning: () => void;   // called when warning should appear
  onLogout: () => void;    // called when auto-logout fires
  onReset: () => void;     // called when activity resets the timer (hide warning)
  enabled: boolean;
}

export function useInactivityLogout({ onWarning, onLogout, onReset, enabled }: Options) {
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWarningShown = useRef(false);
  const lastRefresh = useRef<number>(0);
  // Track when the user was last "active" (event arrived) so that when
  // the inactivity timer fires we can report the actual idle duration.
  const lastActivity = useRef<number>(Date.now());

  const clearTimers = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
  }, []);

  const maybeRefreshToken = useCallback(() => {
    const now = Date.now();
    // Throttle: don't refresh more than once per minute
    if (now - lastRefresh.current < 60_000) return;
    const expiryMs = getTokenExpiryMs();
    if (expiryMs !== null && expiryMs < REFRESH_THRESHOLD_MS) {
      lastRefresh.current = now;
      logDisconnect('refresh_attempt', { detail: `expiry in ${Math.round(expiryMs / 1000)}s` });
      authService.refreshToken();
    }
  }, []);

  const resetTimers = useCallback(() => {
    if (!enabled) return;
    clearTimers();
    lastActivity.current = Date.now();
    maybeRefreshToken();

    if (isWarningShown.current) {
      isWarningShown.current = false;
      onReset();
    }

    warningTimer.current = setTimeout(() => {
      isWarningShown.current = true;
      logDisconnect('inactivity_warning_shown', {
        idleMs: Date.now() - lastActivity.current,
        lastActivityAt: new Date(lastActivity.current).toISOString(),
      });
      onWarning();
    }, WARNING_MS);

    logoutTimer.current = setTimeout(() => {
      logDisconnect('inactivity_logout', {
        idleMs: Date.now() - lastActivity.current,
        lastActivityAt: new Date(lastActivity.current).toISOString(),
      });
      onLogout();
    }, TIMEOUT_MS);
  }, [enabled, clearTimers, maybeRefreshToken, onWarning, onLogout, onReset]);

  useEffect(() => {
    if (!enabled) return;

    // keydown instead of keypress (keypress is deprecated and misses Hebrew input)
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

    const handleActivity = () => resetTimers();

    // Also reset when user returns to the tab (visibility change)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') resetTimers();
    };

    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibility);
    resetTimers(); // start timers on mount

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
      clearTimers();
    };
  }, [enabled, resetTimers, clearTimers]);

  return { resetTimers };
}
