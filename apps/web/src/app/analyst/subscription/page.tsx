"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

type AnalystTenantRow = {
  tenantId: string;
  tenantName: string;
  ownerUserId: string;
  ownerEmail: string | null;
  ownerPlanTier: string | null;
};

export default function AnalystSubscriptionPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AnalystTenantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    setMsg("");
    try {
      const data = await api.searchAnalysts(query.trim() || undefined);
      setItems((data as any).analysts || []);
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
  }, []);

  const subscribe = async (tenantId: string) => {
    setLoading(true);
    setMsg("");
    try {
      await api.requestSubscription(tenantId);
      setMsg("✅ Solicitud enviada (PENDING). El analista debe aprobarla.");
      await load(); // recarga lista (y ya no debería aparecer)
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
          <div style={{ fontSize: 12, opacity: 0.7 }}>Suscripciones</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Buscar analistas (tenants) y suscribirse</div>
        </div>

        <a
          className="secondary"
          href="/analyst"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 12px",
            borderRadius: 12,
            border: "1px solid #1e293b",
          }}
        >
          Volver
        </a>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder="Buscar por nombre del tenant (analista)"
          style={{ flex: 1 }}
        />
        <button className="secondary" onClick={load} disabled={loading}>
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {msg ? <div style={{ marginTop: 12, opacity: 0.9 }}>{msg}</div> : null}

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {items.map((a) => (
          <div key={a.tenantId} style={{ border: "1px solid #1e293b", borderRadius: 14, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 800 }}>{a.tenantName}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {a.ownerEmail ? `Owner: ${a.ownerEmail}` : "Owner: —"} {a.ownerPlanTier ? `· Plan: ${a.ownerPlanTier}` : ""}
                </div>
              </div>

              <button className="secondary" onClick={() => subscribe(a.tenantId)} disabled={loading}>
                Suscribirme
              </button>
            </div>
          </div>
        ))}

        {!loading && items.length === 0 ? (
          <div style={{ opacity: 0.8 }}>
            No hay analistas disponibles para suscribirte (o ya los tenés PENDING/ACTIVE).
          </div>
        ) : null}
      </div>
    </div>
  );
}
