"use client";
import { useState } from "react";
import { api } from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: 520 }}>
      <h2>Login</h2>
      <div style={{ display: "grid", gap: 8 }}>
        <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button
          onClick={async () => {
            setMsg(null);
            try {
              await api.login({ email, password });
              location.href = "/dashboard";
            } catch (e: any) {
              setMsg(String(e.message));
            }
          }}
        >
          Entrar
        </button>
        {msg && <pre style={{ whiteSpace: "pre-wrap", color: "crimson" }}>{msg}</pre>}
      </div>
    </div>
  );
}
