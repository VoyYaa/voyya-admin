import { useCallback, useLayoutEffect, useRef } from 'react';

export function useRestoreFocus(open: boolean): (event: Event) => void {
  const returnTargetRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (open && document.activeElement instanceof HTMLElement) {
      returnTargetRef.current = document.activeElement;
    }
  }, [open]);

  return useCallback((event: Event) => {
    event.preventDefault();
    returnTargetRef.current?.focus();
  }, []);
}
