import { useEffect, useRef } from 'react';
import { useNetworkOnline } from './useNetworkOnline';

export function useOnReconnect(enabled: boolean, callback: () => void): void {
  const online = useNetworkOnline();
  const wasOnlineRef = useRef(online);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const reconnected = !wasOnlineRef.current && online;
    wasOnlineRef.current = online;
    if (reconnected && enabled) callbackRef.current();
  }, [online, enabled]);
}
