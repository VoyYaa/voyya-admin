import { useEffect, useState } from 'react';

export function useDocumentVisibility(): boolean {
  const [visible, setVisible] = useState(document.visibilityState === 'visible');

  useEffect(() => {
    function onChange(): void {
      setVisible(document.visibilityState === 'visible');
    }
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return visible;
}
