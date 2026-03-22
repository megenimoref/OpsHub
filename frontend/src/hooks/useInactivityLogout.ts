import { useEffect, useRef, useCallback } from 'react';

const TIMEOUT_MS = 2 * 60 * 60 * 1000;        // 2 hours → logout
const WARNING_MS = TIMEOUT_MS - 5 * 60 * 1000; // 5 minutes before logout → show warning

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

  const clearTimers = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
  }, []);

  const resetTimers = useCallback(() => {
    if (!enabled) return;
    clearTimers();

    if (isWarningShown.current) {
      isWarningShown.current = false;
      onReset();
    }

    warningTimer.current = setTimeout(() => {
      isWarningShown.current = true;
      onWarning();
    }, WARNING_MS);

    logoutTimer.current = setTimeout(() => {
      onLogout();
    }, TIMEOUT_MS);
  }, [enabled, clearTimers, onWarning, onLogout, onReset]);

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
