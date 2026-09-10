import { useEffect } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

/**
 * On a hard refresh the access token is gone (it only lives in memory), but the
 * httpOnly refresh cookie may still be valid — so try once to re-establish the
 * session before deciding the user is anonymous.
 */
export function useSessionBootstrap() {
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.post('/auth/refresh', undefined, { retry: false });
        if (!cancelled) setSession(data);
      } catch {
        if (!cancelled) clearSession();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setSession, clearSession]);
}
