import { create } from 'zustand';
import type { FreshnessState } from '../copy/freshness';

export interface PublishedFreshness {
  state: FreshnessState;
  errorStatus?: number;
}

interface ConnectionState {
  published: PublishedFreshness | null;
  publish: (value: PublishedFreshness | null) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  published: null,
  publish: (value) => set({ published: value }),
}));
