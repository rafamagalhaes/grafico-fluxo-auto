import { useState, useEffect, useCallback } from "react";

export type AutoRefreshInterval = 0 | 1 | 5 | 10 | 30 | 60;

const STORAGE_KEY = "dashboard-auto-refresh-interval";

export function useAutoRefresh() {
  const [interval, setIntervalValue] = useState<AutoRefreshInterval>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if ([0, 1, 5, 10, 30, 60].includes(parsed)) {
        return parsed as AutoRefreshInterval;
      }
    }
    return 0; // Disabled by default
  });

  const setInterval = useCallback((newInterval: AutoRefreshInterval) => {
    setIntervalValue(newInterval);
    localStorage.setItem(STORAGE_KEY, String(newInterval));
  }, []);

  return { interval, setInterval };
}

export function useDashboardAutoRefresh(refetch: () => void) {
  const { interval } = useAutoRefresh();

  useEffect(() => {
    if (interval === 0) return;

    const intervalMs = interval * 60 * 1000;
    const timer = window.setInterval(() => {
      refetch();
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [interval, refetch]);

  return interval;
}
