"use client";
import Link from "next/link";
import { clearToken } from "../lib/api";
import { getUser } from "../lib/session";

export default function Home() {
  const user = getUser();

  return (
    <div style={{ maxWidth: 760 }}>
      <h1>Inicio</h1>
      {!user ? (
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/login">Login</Link>
          <Link href="/register">Register</Link>
        </div>
      ) : (
        <>
          <p>Logueado como <b>{user.email}</b> ({user.globalRole})</p>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/dashboard">Ir al dashboard</Link>
            <Link href="/map"><button>Ir al Mapa</button></Link>
            <button onClick={() => { clearToken(); location.href="/"; }}>Logout</button>
          </div>
        </>
      )}

      <hr />
      <p>
        Este MVP implementa: login, tenants (analista) y administración de subscriptores (approve/revoke + flags).
      </p>
    </div>
  );
}
