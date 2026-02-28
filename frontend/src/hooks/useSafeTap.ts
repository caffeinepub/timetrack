import { useRef, useCallback } from 'react';

interface SafeTapOptions {
  /** Minimum ms between two accepted taps (default 350) */
  debounceMs?: number;
  /** If true, blur the event target after tap to dismiss mobile keyboard/focus ring */
  blurOnTap?: boolean;
}

/**
 * Returns a wrapper that makes an async handler safe against:
 * - Rapid double-taps on Android Chrome (debounce)
 * - Concurrent async executions (lock)
 * - DOMException removeChild crashes caused by React unmounting during touch events
 *
 * Usage:
 *   const safeTap = useSafeTap();
 *   <button onClick={safeTap(handlePress)}>…</button>
 */
export function useSafeTap(options: SafeTapOptions = {}) {
  const { debounceMs = 350, blurOnTap = true } = options;

  const lastTapRef = useRef<number>(0);
  const lockedRef = useRef<boolean>(false);

  const wrap = useCallback(
    <T extends unknown[]>(
      handler: (...args: T) => void | Promise<void>,
    ) =>
      (...args: T) => {
        const now = Date.now();

        // Debounce: ignore taps that arrive too quickly
        if (now - lastTapRef.current < debounceMs) {
          return;
        }

        // Lock: ignore taps while an async operation is in flight
        if (lockedRef.current) {
          return;
        }

        lastTapRef.current = now;

        // Blur the active element to prevent Android Chrome focus-related DOM issues
        if (blurOnTap) {
          try {
            const active = document.activeElement as HTMLElement | null;
            if (active && typeof active.blur === 'function') {
              active.blur();
            }
          } catch {
            // ignore
          }
        }

        // Defer the actual handler to the next animation frame so that any
        // in-progress touch/pointer events finish before React mutates the DOM.
        // This is the primary fix for the removeChild DOMException on Android Chrome.
        requestAnimationFrame(() => {
          const result = handler(...args);

          if (result instanceof Promise) {
            lockedRef.current = true;
            result.finally(() => {
              // Release lock after a short delay to absorb any trailing events
              setTimeout(() => {
                lockedRef.current = false;
              }, debounceMs);
            });
          }
        });
      },
    [debounceMs, blurOnTap],
  );

  return wrap;
}
