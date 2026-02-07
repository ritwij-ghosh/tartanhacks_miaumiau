import { supabase } from "./supabase";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function request<T = any>(
  method: string,
  path: string,
  body?: unknown,
  retries = 2
): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Retry on 503 (server reloading)
  if (res.status === 503 && retries > 0) {
    await new Promise((r) => setTimeout(r, 2000));
    return request<T>(method, path, body, retries - 1);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const error = new Error(err.detail || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).response = err;
    throw error;
  }

  return res.json();
}

export const api = {
  get: <T = any>(path: string) => request<T>("GET", path),
  post: <T = any>(path: string, body?: unknown) =>
    request<T>("POST", path, body),
  put: <T = any>(path: string, body?: unknown) =>
    request<T>("PUT", path, body),
  delete: <T = any>(path: string) => request<T>("DELETE", path),
};
