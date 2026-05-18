const BASE = "";

type FetchOptions = RequestInit & { token?: string };

/** Fetch without auto-auth (used by the auth store itself to avoid circular deps). */
export async function apiFetchAnon<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, error.code ?? "unknown", error.detail ?? res.statusText);
  }
  if (res.status === 204 || res.status === 202) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiFetch<T = unknown>(
  path: string,
  { token, ...init }: FetchOptions = {},
  _retried = false
): Promise<T> {
  const { useAuthStore } = typeof window !== "undefined"
    ? await import("@/stores/auth")
    : { useAuthStore: null as any };

  const resolvedToken = token ?? useAuthStore?.getState().accessToken ?? undefined;

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (resolvedToken) headers.set("Authorization", `Bearer ${resolvedToken}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  // Auto-refresh on 401 — try once with a fresh token
  if (res.status === 401 && !_retried && useAuthStore) {
    const refreshed = await useAuthStore.getState().refresh();
    if (refreshed) return apiFetch<T>(path, { token, ...init }, true);
    // Refresh failed — stay logged out, let callers handle it
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, error.code ?? "unknown", error.detail ?? res.statusText);
  }

  if (res.status === 204 || res.status === 202) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}
