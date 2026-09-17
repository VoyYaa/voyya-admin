import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export function useRowFlash<TStatus extends string>(
  rows: ReadonlyArray<{ id: number; status: TStatus }>,
): Record<number, boolean> {
  const previousRef = useRef<Map<number, TStatus>>(new Map());
  const [flashing, setFlashing] = useState<Record<number, boolean>>({});
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const previous = previousRef.current;
    const nextMap = new Map<number, TStatus>();
    const changedIds: number[] = [];

    for (const row of rows) {
      nextMap.set(row.id, row.status);
      const prevStatus = previous.get(row.id);
      if (prevStatus === undefined || prevStatus !== row.status) {
        changedIds.push(row.id);
      }
    }
    previousRef.current = nextMap;

    if (reducedMotion || changedIds.length === 0) return;

    setFlashing((current) => {
      const next = { ...current };
      changedIds.forEach((id) => {
        next[id] = true;
      });
      return next;
    });

    const timers = changedIds.map((id, index) =>
      window.setTimeout(
        () => {
          setFlashing((current) => {
            const next = { ...current };
            delete next[id];
            return next;
          });
        },
        350 + index * 80,
      ),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [rows, reducedMotion]);

  return flashing;
}
