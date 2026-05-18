import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  // accessToken lives in memory only — never persisted to localStorage (XSS mitigation)
  accessToken: string | null;
  // refreshToken persisted so user stays logged in across reloads
  refreshToken: string | null;
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
      refreshToken: null,
      userId: null,
      orgId: null,
      roles: [],
      locale: "uz",
      _hydrated: false,
      setTokens: (accessToken, refreshToken, userId, orgId, roles, locale = "uz") =>
        set({ accessToken, refreshToken, userId, orgId, roles, locale }),
      refresh: async () => {
        const rt = get().refreshToken;
        if (!rt) return false;
        try {
          const res = await fetch(`/api/v1/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: rt }),
          });
          if (!res.ok) throw new Error("Refresh failed");
          const data = await res.json();
          set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken ?? rt,
            userId: data.userId,
            orgId: data.orgId,
            roles: data.roles ?? [],
            locale: data.locale ?? get().locale,
          });
          return true;
        } catch {
          set({ accessToken: null, refreshToken: null, userId: null, orgId: null, roles: [] });
          return false;
        }
      },
      clear: () =>
        set({ accessToken: null, refreshToken: null, userId: null, orgId: null, roles: [], locale: "uz" }),
    }),
    {
      name: "zeyvo-auth",
      // Persist only refreshToken + metadata; accessToken stays in memory
      partialize: (state) => ({
        refreshToken: state.refreshToken,
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
