import { useEffect, useState } from 'react';

/**
 * Returns [value, setValue]. When set to a truthy value, automatically resets
 * to the initial value after `delayMs` milliseconds.
 */
// NOTE: initial must be a primitive (string, number, boolean, null) — object
// literals are not safe as React dependency values and will cause infinite loops.
export function useAutoReset<T>(initial: T, delayMs: number): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    if (value === initial) return;
    const t = setTimeout(() => setValue(initial), delayMs);
    return () => clearTimeout(t);
  }, [value, initial, delayMs]);

  return [value, setValue];
}
