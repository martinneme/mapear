"use client";
import { useState } from "react";
import { api } from "../../lib/api";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [globalRole, setGlobalRole] = useState<"ANALYST" | "SUBSCRIBER">("SUBSCRIBER");
  const [tenantName, setTenantName] = useState("Mi Analista");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>Register</h2>
      <div style={{ display: "grid", gap: 8 }}>
        <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="password (min 6)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <label>
          Rol:
          <select value={globalRole} onChange={(e) => setGlobalRole(e.target.value as any)} style={{ marginLeft: 8 }}>
            <option value="SUBSCRIBER">SUBSCRIBER</option>
            <option value="ANALYST">ANALYST</option>
          </select>
        </label>

        {globalRole === "ANALYST" && (
          <input placeholder="Nombre del analista/tenant" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
        )}

        <button
          onClick={async () => {
            setMsg(null);
            try {
              const data = await api.register({ email, password, globalRole, tenantName: globalRole === "ANALYST" ? tenantName : undefined });
              setMsg(`OK. Ahora hacé login. ${data.tenant ? "Tenant creado: " + data.tenant.id : ""}`);
            } catch (e: any) {
              setMsg(String(e.message));
            }
          }}
        >
          Crear cuenta
        </button>

        {msg && <pre style={{ whiteSpace: "pre-wrap" }}>{msg}</pre>}
      </div>
    </div>
  );
}
