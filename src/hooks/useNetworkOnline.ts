import { useEffect, useState } from 'react';

export function useNetworkOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    function goOnline(): void {
      setOnline(true);
    }
    function goOffline(): void {
      setOnline(false);
    }
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
