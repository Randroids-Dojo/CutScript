import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Like useState, but automatically resets to `initial` after `delayMs`.
 * Useful for "Copied!" / "Saved!" feedback that should disappear.
 */
export function useAutoReset<T>(
  initial: T,
  delayMs: number,
): [T, (value: T) => void] {
  const [value, setValueRaw] = useState<T>(initial);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const setValue = useCallback(
    (next: T) => {
      setValueRaw(next);
      clearTimeout(timer.current);
      if (next !== initial) {
        timer.current = setTimeout(() => setValueRaw(initial), delayMs);
      }
    },
    [initial, delayMs],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return [value, setValue];
}
