const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type AuthUser = {
  id: string;
  email: string;
  globalRole: "ANALYST" | "SUBSCRIBER";
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

  // ⚠️ Puede venir HTML si hay 404 u otra cosa
  const text = await res.text().catch(() => "");

  // Intentar parsear JSON solo si parece JSON
  let data: any = {};
  const looksJson = text.trim().startsWith("{") || text.trim().startsWith("[");
  if (text && looksJson) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }

  if (!res.ok) {
    // Si vino HTML, mostrar algo útil
    const msg =
      data?.error
        ? typeof data.error === "string"
          ? data.error
          : JSON.stringify(data.error)
        : text
        ? `HTTP ${res.status} ${res.statusText} - ${text.slice(0, 140)}`
        : res.statusText;

    throw new Error(msg);
  }

  return data as any;
}

export const api = {
  // ===== Auth =====
  register: (payload: { email: string; password: string; globalRole: "ANALYST" | "SUBSCRIBER"; tenantName?: string }) =>
    apiFetch("/auth/register", { method: "POST", body: JSON.stringify(payload) }),

  login: async (payload: { email: string; password: string }) => {
    const data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify(payload) });
    setToken((data as any).accessToken);
    localStorage.setItem("refreshToken", (data as any).refreshToken);
    localStorage.setItem("user", JSON.stringify((data as any).user));
    return data;
  },

  meTenant: () => apiFetch("/tenants/me"),

  // ===== Tenants access/subscribers (lo que ya tenías) =====
  requestAccess: (tenantId: string) => apiFetch(`/tenants/${tenantId}/access-requests`, { method: "POST", body: "{}" }),

  listSubscribers: (tenantId: string) => apiFetch(`/tenants/${tenantId}/subscribers`),

  approveSubscriber: (tenantId: string, subscriberUserId: string) =>
    apiFetch(`/tenants/${tenantId}/subscribers/${subscriberUserId}/approve`, { method: "POST" }),

  revokeSubscriber: (tenantId: string, subscriberUserId: string) =>
    apiFetch(`/tenants/${tenantId}/subscribers/${subscriberUserId}/revoke`, { method: "POST" }),

  updateSubscriber: (tenantId: string, subscriberUserId: string, payload: any) =>
    apiFetch(`/tenants/${tenantId}/subscribers/${subscriberUserId}`, { method: "PUT", body: JSON.stringify(payload) }),

  // ===== Layers =====
  layers: () => apiFetch("/layers"),

  // ===== Events =====
  eventsGeo: (layerKey: string, iso3?: string, authorUserId?: string) => {
    const q = new URLSearchParams({ layer: layerKey });
    if (iso3) q.set("iso3", iso3);
    if (authorUserId) q.set("authorUserId", authorUserId);
    return apiFetch(`/events?${q.toString()}`);
  },

  // ABM analista
  myEvents: () => apiFetch("/events/me"),
  createMyEvent: (payload: any) => apiFetch("/events/me", { method: "POST", body: JSON.stringify(payload) }),
  updateMyEvent: (id: string, payload: any) =>
    apiFetch(`/events/me/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteMyEvent: (id: string) => apiFetch(`/events/me/${id}`, { method: "DELETE" }),

  // ===== Analysts directory (TENANTS suscribibles) =====
  searchAnalysts: (query?: string, limit?: number, cursor?: string) => {
    const q = new URLSearchParams();
    if (query) q.set("query", query);
    if (limit) q.set("limit", String(limit));
    if (cursor) q.set("cursor", cursor);
    const qs = q.toString();
    return apiFetch(`/analysts${qs ? `?${qs}` : ""}`);
  },

  // ===== Subscriptions (subscriber side) user -> tenant =====
  requestSubscription: (tenantId: string) =>
    apiFetch("/subscriptions/request", { method: "POST", body: JSON.stringify({ tenantId }) }),

  mySubscriptions: (status: "PENDING" | "ACTIVE" | "REJECTED" | "CANCELED" | "ALL" = "ALL") =>
    apiFetch(`/subscriptions/mine?status=${status}`),

  myTenants: (status: "PENDING" | "ACTIVE" | "REJECTED" | "CANCELED" | "ALL" = "ACTIVE") =>
    apiFetch(`/subscriptions/my-tenants?status=${status}`),

  cancelSubscription: (subscriptionId: string) =>
    apiFetch(`/subscriptions/${subscriptionId}/cancel`, { method: "POST", body: "{}" }),

  // ===== Subscriptions (analyst admin) owner of tenant =====
  ownerRequests: (status: "PENDING" | "ACTIVE" | "REJECTED" | "CANCELED" | "ALL" = "PENDING") =>
    apiFetch(`/subscriptions/owner/requests?status=${status}`),

  decideSubscription: (id: string, action: "APPROVE" | "REJECT") =>
    apiFetch(`/subscriptions/${id}/decide`, { method: "POST", body: JSON.stringify({ action }) }),
};
