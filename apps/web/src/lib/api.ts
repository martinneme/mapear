const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type PlanTier = "INVITED" | "SUBSCRIBER" | "SUBSCRIBER_PLUS";

export type AuthUser = {
  id: string;
  email: string;
  globalRole: "ANALYST" | "SUBSCRIBER";
  planTier?: PlanTier; // backend ya lo devuelve, lo dejamos opcional por compat
};

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}
export function setToken(t: string) {
  localStorage.setItem("accessToken", t);
}
export function clearToken() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ? JSON.stringify(data.error) : data?.error || res.statusText);
  return data;
}

export const api = {
  register: (payload: { email: string; password: string; globalRole: "ANALYST" | "SUBSCRIBER"; tenantName?: string }) =>
    apiFetch("/auth/register", { method: "POST", body: JSON.stringify(payload) }),

  login: async (payload: { email: string; password: string }) => {
    const data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify(payload) });
    setToken(data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    return data;
  },

  meTenant: () => apiFetch("/tenants/me"),

  requestAccess: (tenantId: string) => apiFetch(`/tenants/${tenantId}/access-requests`, { method: "POST", body: "{}" }),

  listSubscribers: (tenantId: string) => apiFetch(`/tenants/${tenantId}/subscribers`),

  approveSubscriber: (tenantId: string, subscriberUserId: string) =>
    apiFetch(`/tenants/${tenantId}/subscribers/${subscriberUserId}/approve`, { method: "POST" }),

  revokeSubscriber: (tenantId: string, subscriberUserId: string) =>
    apiFetch(`/tenants/${tenantId}/subscribers/${subscriberUserId}/revoke`, { method: "POST" }),

  updateSubscriber: (tenantId: string, subscriberUserId: string, payload: any) =>
    apiFetch(`/tenants/${tenantId}/subscribers/${subscriberUserId}`, { method: "PUT", body: JSON.stringify(payload) }),

  // NUEVO (lo vamos a usar después):
  layers: () => apiFetch("/layers"),
  content: (iso3: string, layerKey: string) => apiFetch(`/content?iso3=${encodeURIComponent(iso3)}&layer=${encodeURIComponent(layerKey)}`),
};
