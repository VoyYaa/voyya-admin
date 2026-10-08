import { useCallback, useState } from 'react';
import type { SettlementReportQuery } from '@voyyaa/shared';
import { downloadSettlementCsv } from '../api/settlement.api';
import { ApiError, isNetworkError } from '../api/errors';
import { SETTLEMENT_COPY } from '../copy/settlement';
import { useToastStore } from '../state/toast-store';

const HTTP_FORBIDDEN = 403;

function downloadMessage(error: unknown): string {
  if (isNetworkError(error)) return SETTLEMENT_COPY.csv.offline;
  if (error instanceof ApiError && error.status === HTTP_FORBIDDEN) {
    return SETTLEMENT_COPY.csv.forbidden;
  }
  return SETTLEMENT_COPY.csv.error;
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export interface SettlementCsvDownload {
  busy: boolean;
  error: string | null;
  download: () => Promise<void>;
}

export function useSettlementCsvDownload(query: SettlementReportQuery): SettlementCsvDownload {
  const pushToast = useToastStore((state) => state.pushToast);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const file = await downloadSettlementCsv(query);
      const filename = file.filename ?? SETTLEMENT_COPY.csv.fallbackName(query.from, query.to);
      saveBlob(file.blob, filename);
      pushToast('success', SETTLEMENT_COPY.csv.success(filename));
    } catch (caught) {
      setError(downloadMessage(caught));
    } finally {
      setBusy(false);
    }
  }, [query, pushToast]);

  return { busy, error, download };
}
