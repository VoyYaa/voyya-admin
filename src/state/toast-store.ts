import { create } from 'zustand';

export interface ToastMessage {
  id: number;
  tone: 'success' | 'danger';
  message: string;
}

interface ToastState {
  toasts: ToastMessage[];
  pushToast: (tone: ToastMessage['tone'], message: string) => void;
  dismissToast: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: (tone, message) => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, tone, message }] }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
