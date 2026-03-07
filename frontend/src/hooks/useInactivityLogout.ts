import { useEffect, useRef, useCallback } from 'react';

const TIMEOUT_MS = 5 * 60 * 1000;   // 5 minutes → logout
const WARNING_MS = 4 * 60 * 1000;   // 4 minutes → show warning (1 min before)

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

    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll', 'click'];

    const handleActivity = () => resetTimers();

    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    resetTimers(); // start timers on mount

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      clearTimers();
    };
  }, [enabled, resetTimers, clearTimers]);

  return { resetTimers };
}
