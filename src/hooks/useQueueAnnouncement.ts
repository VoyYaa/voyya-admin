import { useEffect, useRef, useState } from 'react';

const BATCH_WINDOW_MS = 2000;

export function useQueueAnnouncement<TStatus extends string>(
  rows: ReadonlyArray<{ id: number; status: TStatus }>,
): string {
  const previousRef = useRef<Map<number, TStatus> | null>(null);
  const pendingCountRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const previous = previousRef.current;
    if (previous) {
      let changed = 0;
      for (const row of rows) {
        const prevStatus = previous.get(row.id);
        if (prevStatus !== undefined && prevStatus !== row.status) changed += 1;
      }
      if (changed > 0) {
        pendingCountRef.current += changed;
        if (timerRef.current === null) {
          timerRef.current = window.setTimeout(() => {
            const total = pendingCountRef.current;
            setAnnouncement(
              total === 1
                ? '1 solicitud actualizó su estado.'
                : `${total} solicitudes actualizaron su estado.`,
            );
            pendingCountRef.current = 0;
            timerRef.current = null;
          }, BATCH_WINDOW_MS);
        }
      }
    }
    previousRef.current = new Map(rows.map((row) => [row.id, row.status]));
  }, [rows]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  return announcement;
}
