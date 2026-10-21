/**
 * Backend API configuration and Authentication Client for Wholesale Desk.
 * Live deployed FastAPI backend on Vercel: https://wholesale-ims-backend.vercel.app
 */
export const BACKEND_URL = "https://wholesale-ims-backend.vercel.app";

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL?.trim() || BACKEND_URL
).replace(/\/+$/, "");

const TOKEN_KEY = "ims_auth_token";
const USER_KEY = "ims_auth_user";

export type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  picture: string | null;
  role: "admin" | "manager" | "viewer";
  is_allowed: boolean;
  created_at?: string;
  last_login?: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const token = getToken();

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${normalizedPath}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (response.status === 401 && typeof window !== "undefined") {
    // Session expired or invalid
    clearSession();
    window.dispatchEvent(new Event("ims_auth_logout"));
  }

  return response;
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await apiFetch(path);
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`API error (${response.status}): ${errorBody || response.statusText}`);
  }
  return response.json();
}

export async function postJson<T>(path: string, data: unknown): Promise<T> {
  const response = await apiFetch(path, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`API error (${response.status}): ${errorBody || response.statusText}`);
  }
  return response.json();
}

export async function patchJson<T>(path: string, data: unknown): Promise<T> {
  const response = await apiFetch(path, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`API error (${response.status}): ${errorBody || response.statusText}`);
  }
  return response.json();
}

export async function deleteJson<T>(path: string): Promise<T> {
  const response = await apiFetch(path, {
    method: "DELETE",
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`API error (${response.status}): ${errorBody || response.statusText}`);
  }
  return response.json();
}

// Authentication Service Calls
export async function googleLogin(credential: string): Promise<AuthResponse> {
  const res = await postJson<AuthResponse>("/api/auth/google", { credential });
  setSession(res.access_token, res.user);
  return res;
}

export async function devLogin(email: string): Promise<AuthResponse> {
  const res = await postJson<AuthResponse>("/api/auth/dev-login", { email });
  setSession(res.access_token, res.user);
  return res;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  return getJson<AuthUser>("/api/auth/me");
}
