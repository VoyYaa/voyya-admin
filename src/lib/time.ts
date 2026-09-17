export function computeSkewMs(serverTimeIso: string): number {
  return new Date(serverTimeIso).getTime() - Date.now();
}

export function serverNowMs(skewMs: number): number {
  return Date.now() + skewMs;
}

export function elapsedMsSince(iso: string, skewMs: number): number {
  return Math.max(0, serverNowMs(skewMs) - new Date(iso).getTime());
}

export function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { hour12: false });
}

export function formatDurationMmSs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatRelativeMinutes(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60000));
  return minutes <= 0 ? 'hace instantes' : `hace ${minutes} min`;
}

export function formatRelativeSeconds(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `hace ${seconds}s`;
}
