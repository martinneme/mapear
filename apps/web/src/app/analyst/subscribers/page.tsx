"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import { readUserFromStorage, SessionUser } from "../../../lib/session";

function getQueryTenantId() {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  return url.searchParams.get("tenantId") || "";
}

export default function SubscribersPage() {
  const tenantId = useMemo(() => getQueryTenantId(), []);

  const [user, setUser] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function reload() {
    setMsg(null);
    try {
      const d = await api.listSubscribers(tenantId);
      setRows(d.subscribers);
    } catch (e: any) {
      setMsg(String(e.message));
    }
  }

  useEffect(() => {
    setHydrated(true);
    const u = readUserFromStorage();
    setUser(u);

    if (!u) return void (location.href = "/login");
    if (u.globalRole !== "ANALYST") return void (location.href = "/dashboard");
    if (!tenantId) setMsg("Falta tenantId en la URL");
    else reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hydrated) {
    return (
      <div className="card p-6">
        <p className="text-slate-300">Cargando…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Administrar subscribers</h2>
            <p className="mt-1 text-sm text-slate-400">
              tenantId: <span className="font-mono text-slate-100">{tenantId}</span>
            </p>
          </div>

          <div className="flex gap-3">
            <button className="secondary" onClick={reload}>Refrescar</button>
            <Link href="/dashboard">
              <button className="secondary">Volver</button>
            </Link>
          </div>
        </div>

        {msg && (
          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            <pre className="whitespace-pre-wrap">{msg}</pre>
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/70">
              <tr className="text-left text-slate-300">
                <th className="px-4 py-3 font-medium">Subscriber</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Suggest Content</th>
                <th className="px-4 py-3 font-medium">Suggest Relations</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {rows.map((r) => (
                <tr key={r._id} className="hover:bg-slate-900/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">
                      {r.subscriber?.email || r.subscriberUserId}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      <span className="font-mono">{r.subscriberUserId}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className="badge">{r.status}</span>
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={!!r.canSuggestContent}
                      onChange={async (e) => {
                        await api.updateSubscriber(tenantId, r.subscriberUserId, {
                          canSuggestContent: e.target.checked,
                        });
                        reload();
                      }}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={!!r.canSuggestRelations}
                      onChange={async (e) => {
                        await api.updateSubscriber(tenantId, r.subscriberUserId, {
                          canSuggestRelations: e.target.checked,
                        });
                        reload();
                      }}
                    />
                  </td>

                  <td className="px-4 py-3">
                    {r.status !== "ACTIVE" ? (
                      <button
                        onClick={async () => {
                          await api.approveSubscriber(tenantId, r.subscriberUserId);
                          reload();
                        }}
                      >
                        Approve
                      </button>
                    ) : (
                      <button
                        className="secondary"
                        onClick={async () => {
                          await api.revokeSubscriber(tenantId, r.subscriberUserId);
                          reload();
                        }}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-slate-400">
                    No hay subscribers todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
