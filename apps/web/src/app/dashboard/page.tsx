"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, clearToken } from "../../lib/api";
import { readUserFromStorage, SessionUser } from "../../lib/session";


export default function Home() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setUser(readUserFromStorage());
  }, []);

  if (!hydrated) {
    return (
      <div className="card p-6">
        <p className="text-slate-300">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Panel de acceso</h1>
            <p className="mt-2 text-slate-300">
              Base MVP: login + tenant del analista + habilitación/deshabilitación de suscriptores.
            </p>
          </div>

          <div className="flex gap-3">
            {!user ? (
              <>
                <Link href="/login"><button>Login</button></Link>
                <Link href="/register"><button className="secondary">Register</button></Link>
              </>
            ) : (
              <>
                <Link href="/dashboard"><button>Dashboard</button></Link>
                <button className="secondary" onClick={() => { clearToken(); location.href = "/"; }}>
                  Logout
                </button>
              </>
            )}
          </div>
        </div>

        {user && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="badge">Logueado</span>
            <span className="text-slate-200">
              <b>{user.email}</b> · {user.globalRole}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}