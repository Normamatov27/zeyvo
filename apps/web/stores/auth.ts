import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  // accessToken lives in memory only — never persisted to localStorage (XSS mitigation)
  accessToken: string | null;
  userId: string | null;
  orgId: string | null;
  roles: string[];
  locale: string;
  _hydrated: boolean;
  setTokens: (
    access: string,
    refresh: string | null,
    userId: string,
    orgId: string | null,
    roles: string[],
    locale?: string
  ) => void;
  refresh: () => Promise<boolean>;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      userId: null,
      orgId: null,
      roles: [],
      locale: "uz",
      _hydrated: false,
      setTokens: (accessToken, _refresh, userId, orgId, roles, locale = "uz") =>
        // _refresh param accepted for API compatibility but not stored — cookie handles it
        set({ accessToken, userId, orgId, roles, locale }),
      refresh: async () => {
        try {
          // Web: refresh cookie is httpOnly — send credentials, no body token needed.
          // Telegram Mini App: falls back to body token if needed (handled in a
          // separate Telegram-aware path; here we use the cookie-first path).
          const res = await fetch(`/api/v1/auth/refresh`, {
            method: "POST",
            credentials: "include",
          });
          if (!res.ok) throw new Error("Refresh failed");
          const data = await res.json();
          set({
            accessToken: data.accessToken,
            userId: data.userId,
            orgId: data.orgId,
            roles: data.roles ?? [],
            locale: data.locale ?? get().locale,
          });
          return true;
        } catch {
          set({ accessToken: null, userId: null, orgId: null, roles: [] });
          return false;
        }
      },
      clear: () =>
        set({ accessToken: null, userId: null, orgId: null, roles: [], locale: "uz" }),
    }),
    {
      name: "zeyvo-auth",
      // Persist only non-sensitive metadata; accessToken in memory, refreshToken in httpOnly cookie
      partialize: (state) => ({
        userId: state.userId,
        orgId: state.orgId,
        roles: state.roles,
        locale: state.locale,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hydrated = true;
      },
    }
  )
);
