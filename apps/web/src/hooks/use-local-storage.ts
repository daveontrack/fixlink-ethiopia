"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Persisted state in localStorage (filters, preferences).
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) setValue(JSON.parse(stored) as T);
    } catch {
      // Ignore storage errors (private mode, quota, …).
    }
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Ignore storage errors.
      }
    },
    [key],
  );

  return [value, update] as const;
}
