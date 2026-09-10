import { create } from 'zustand';

let toastId = 0;

export const useUiStore = create((set, get) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),

  toasts: [],
  toast: (message, tone = 'ok') => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => get().dismissToast(id), tone === 'err' ? 6000 : 3500);
    return id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // Generic confirm dialog: await confirm({ ... }) resolves true/false.
  confirmState: null,
  confirm: (options) =>
    new Promise((resolve) => {
      set({ confirmState: { ...options, resolve } });
    }),
  resolveConfirm: (result) => {
    const { confirmState } = get();
    confirmState?.resolve?.(result);
    set({ confirmState: null });
  },
}));

export const toast = (message, tone) => useUiStore.getState().toast(message, tone);
export const confirmDialog = (options) => useUiStore.getState().confirm(options);
