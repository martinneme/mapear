"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

type GlobalRole = "ANALYST" | "SUBSCRIBER";
type SubStatus = "PENDING" | "ACTIVE" | "REJECTED" | "CANCELED" | "ALL";

type StoredUser = {
  id: string;
  email: string;
  globalRole: GlobalRole;
};

function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!u?.id || !u?.globalRole) return null;
    return u as StoredUser;
  } catch {
    return null;
  }
}

export default function AnalystRootPage() {
  const [me, setMe] = useState<StoredUser | null>(null);

  useEffect(() => {
    setMe(getStoredUser());
  }, []);

  if (!me) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Cuenta</div>
        <div style={{ marginTop: 8, opacity: 0.85 }}>
          No hay sesión iniciada (o falta <code>user</code> en localStorage).
        </div>
      </div>
    );
  }

  if (me.globalRole === "ANALYST") return <AnalystSubscriptionsAdmin />;
  return <SubscriberDashboard />;
}

/* =========================
   ANALYST: Administrador (OWNER de tenant)
   ========================= */

type AdminRow = {
  _id: string;
  status: "PENDING" | "ACTIVE" | "REJECTED" | "CANCELED";
  tenant: { _id: string; name: string } | null;
  subscriber: { _id: string; email: string; displayName?: string; firstName?: string; lastName?: string } | null;
  createdAt?: string;
  updatedAt?: string;
};

function AnalystSubscriptionsAdmin() {
  const [status, setStatus] = useState<SubStatus>("PENDING");
  const [items, setItems] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    setMsg("");
    try {
      // ✅ Nuevo endpoint: ownerRequests
      const data = await api.ownerRequests(status as any);
      setItems((data as any).subscriptions || []);
    } catch (e: any) {
      setMsg(String(e?.message || e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const approve = async (id: string) => {
    setLoading(true);
    setMsg("");
    try {
      await api.decideSubscription(id, "APPROVE");
      await load();
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const reject = async (id: string) => {
    setLoading(true);
    setMsg("");
    try {
      await api.decideSubscription(id, "REJECT");
      await load();
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const cancel = async (id: string) => {
    setLoading(true);
    setMsg("");
    try {
      await api.cancelSubscription(id);
      await load();
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Analyst</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Administrador de suscripciones</div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
            Gestionás solicitudes hacia tus <b>tenants</b> (canales).
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="PENDING">Pendientes</option>
            <option value="ACTIVE">Activas</option>
            <option value="REJECTED">Rechazadas</option>
            <option value="CANCELED">Baja</option>
            <option value="ALL">Todas</option>
          </select>

          <a
            className="secondary"
            href="/analyst/subscription"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 12px",
              borderRadius: 12,
              border: "1px solid #1e293b",
            }}
          >
            Directorio (suscribirse)
          </a>
        </div>
      </div>

      {msg ? <div style={{ marginTop: 12, opacity: 0.9 }}>{msg}</div> : null}

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {items.map((r) => {
          const u = r.subscriber;
          const name = u?.displayName || `${u?.firstName || ""} ${u?.lastName || ""}`.trim() || u?.email || "—";
          const tenantName = r.tenant?.name || "Tenant";

          return (
            <div key={r._id} style={{ border: "1px solid #1e293b", borderRadius: 14, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{name}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{u?.email}</div>
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                    Tenant: <b>{tenantName}</b>
                  </div>
                </div>
                <span className="badge">{r.status}</span>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {r.status === "PENDING" ? (
                  <>
                    <button className="secondary" onClick={() => approve(r._id)} disabled={loading}>
                      Aprobar
                    </button>
                    <button className="secondary" onClick={() => reject(r._id)} disabled={loading}>
                      Rechazar
                    </button>
                  </>
                ) : null}

                {r.status === "ACTIVE" ? (
                  <button className="secondary" onClick={() => cancel(r._id)} disabled={loading}>
                    Dar de baja
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}

        {!loading && items.length === 0 ? <div style={{ opacity: 0.8 }}>No hay registros.</div> : null}
      </div>
    </div>
  );
}

/* =========================
   SUBSCRIBER: Dashboard (mis suscripciones a tenants)
   ========================= */

type MySubRow = {
  subscriptionId: string;
  status: "PENDING" | "ACTIVE" | "REJECTED" | "CANCELED";
  tenant: {
    _id: string;
    name: string;
    owner?: { _id: string; email: string; planTier?: string } | null;
  };
  createdAt?: string;
  updatedAt?: string;
};

function SubscriberDashboard() {
  const [items, setItems] = useState<MySubRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    setMsg("");
    try {
      const data = await api.mySubscriptions("ALL");
      setItems((data as any).subscriptions || []);
    } catch (e: any) {
      setMsg(String(e?.message || e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeCount = useMemo(() => items.filter((x) => x.status === "ACTIVE").length, [items]);
  const pendingCount = useMemo(() => items.filter((x) => x.status === "PENDING").length, [items]);

  const cancel = async (subscriptionId: string) => {
    setLoading(true);
    setMsg("");
    try {
      await api.cancelSubscription(subscriptionId);
      await load();
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Subscriber</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Mis suscripciones</div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
            {loading ? "cargando…" : `${activeCount} activas · ${pendingCount} pendientes`}
          </div>
        </div>

        <a
          className="secondary"
          href="/analyst/subscription"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 12px",
            borderRadius: 12,
            border: "1px solid #1e293b",
          }}
        >
          Buscar analistas
        </a>
      </div>

      {msg ? <div style={{ marginTop: 12, opacity: 0.9 }}>{msg}</div> : null}

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {items.map((x) => {
          const tenantName = x.tenant?.name || "Tenant";
          const ownerEmail = x.tenant?.owner?.email || "";

          return (
            <div key={x.subscriptionId} style={{ border: "1px solid #1e293b", borderRadius: 14, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{tenantName}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{ownerEmail}</div>
                </div>
                <span className="badge">{x.status}</span>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {x.status === "ACTIVE" ? (
                  <a
                    className="secondary"
                    href="/maps"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "8px 12px",
                      borderRadius: 12,
                      border: "1px solid #1e293b",
                    }}
                  >
                    Ver en mapa
                  </a>
                ) : null}

                {x.status === "PENDING" || x.status === "ACTIVE" ? (
                  <button className="secondary" onClick={() => cancel(x.subscriptionId)} disabled={loading}>
                    Dar de baja
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}

        {!loading && items.length === 0 ? (
          <div style={{ opacity: 0.8 }}>
            No tenés suscripciones. Andá a <b>/analyst/subscription</b> para buscar analistas.
          </div>
        ) : null}
      </div>
    </div>
  );
}
