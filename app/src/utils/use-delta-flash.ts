import { useEffect, useRef, useState } from "react";

export interface DeltaFlash {
  /** Signed change since the previous value, or null when quiescent. */
  delta: number | null;
}

/**
 * Watches a metric and reports its change for a short flash window, so a
 * headline number can show "+0.3" / "−12%" feedback whenever an interaction
 * moves it — cause→effect stays legible even when the level barely moves.
 */
export function useDeltaFlash(value: number, minDelta: number = 1e-4, holdMs: number = 1800): DeltaFlash {
  const prevRef = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;
    const d = value - prev;
    if (Math.abs(d) < minDelta) return;

    setDelta(d);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDelta(null), holdMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, minDelta, holdMs]);

  return { delta };
}
