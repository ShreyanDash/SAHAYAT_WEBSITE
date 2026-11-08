import { useCallback } from "react";

export type AuthUser = {
  id?: number | string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(_options?: UseAuthOptions) {
  const logout = useCallback(async () => {
    // No-op: independent application has no authentication session.
  }, []);

  return {
    user: null as AuthUser | null,
    loading: false,
    error: null,
    isAuthenticated: false,
    refresh: () => {},
    logout,
  };
}
