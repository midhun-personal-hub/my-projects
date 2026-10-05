import { useState, useEffect } from 'react';

/**
 * Enterprise Custom React Hook: useDebounce
 *
 * Prevents API request flooding and SharePoint REST throttling by buffering fast-changing
 * values (such as search keystrokes) and only updating the return value after a specified
 * delay duration has passed without further modifications.
 *
 * @template T - Generic value type
 * @param value - The active input value to debounce
 * @param delay - Debounce threshold in milliseconds (default: 400ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Initialize countdown timer to commit the value update after the delay threshold
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup phase: Cancel timer if value or delay changes before the timer executes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
