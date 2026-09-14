import { create } from 'zustand';

// The access token lives in memory only — the refresh token is an httpOnly
// cookie, so a page reload re-establishes the session via /auth/refresh
// without ever exposing a long-lived token to JS.
export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  status: 'checking', // checking | authenticated | anonymous

  setSession: ({ accessToken, user }) =>
    set((s) => ({ accessToken, user: user ?? s.user, status: 'authenticated' })),

  setUser: (user) => set({ user }),

  clearSession: () => set({ user: null, accessToken: null, status: 'anonymous' }),

  setStatus: (status) => set({ status }),
}));

export const useIsRole = (...roles) => {
  const role = useAuthStore((s) => s.user?.role);
  return roles.includes(role);
};

// True if the user's role grants ANY of the permissions. The server resolves the
// list (super admin gets all of them) and enforces the same checks on every request.
export const can = (user, ...perms) => perms.some((p) => user?.permissions?.includes(p));

export const useCan = (...perms) => {
  const user = useAuthStore((s) => s.user);
  return can(user, ...perms);
};
