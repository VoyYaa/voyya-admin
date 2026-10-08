import { create } from 'zustand';
import type { FreshnessState } from '../copy/freshness';

export interface PublishedFreshness {
  state: FreshnessState;
  errorStatus?: number;
}

interface ConnectionState {
  published: PublishedFreshness | null;
  refreshing: boolean;
  publish: (value: PublishedFreshness | null) => void;
  setRefreshing: (value: boolean) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  published: null,
  refreshing: false,
  publish: (value) => set({ published: value }),
  setRefreshing: (value) => set({ refreshing: value }),
}));
