"use client";

import { useRouter } from "next/navigation";
import { clearToken, getToken } from "../../lib/api";
import { getUser } from "../../lib/session";
import { Card, Page, PageHeader, SectionTitle, Button } from "../_components/Page";

export default function AccountPage() {
  const router = useRouter();
  const token = getToken();
  const user = typeof window === "undefined" ? null : getUser();

  const doLogout = () => {
    clearToken();
    router.push("/");
    router.refresh();
  };

  const doHardReset = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth-changed"));
      router.push("/");
      router.refresh();
    }
  };

  return (
    <Page>
      <PageHeader
        title="Cuenta"
        subtitle="Diagnóstico de sesión (para evitar el estado zombie)."
        right={
          <div className="flex items-center gap-2">
            <Button variant="danger" onClick={doLogout}>
              Logout
            </Button>
            <Button variant="ghost" onClick={doHardReset}>
              Reset sesión
            </Button>
          </div>
        }
      />

      <Card>
        <SectionTitle>Estado actual</SectionTitle>
        <div className="mt-3 space-y-2 text-sm text-slate-400">
          <div>
            accessToken:{" "}
            <span className="text-slate-200">{token ? "PRESENTE" : "NO"}</span>
          </div>
          <div>
            user en storage:{" "}
            <span className="text-slate-200">{user ? "PRESENTE" : "NO"}</span>
          </div>
          {user ? (
            <>
              <div>
                email: <span className="text-slate-200">{user.email}</span>
              </div>
              <div>
                rol: <span className="text-slate-200">{user.globalRole}</span>
              </div>
              <div>
                plan: <span className="text-slate-200">{user.planTier ?? "INVITED"}</span>
              </div>
            </>
          ) : null}
        </div>
      </Card>

      <Card>
        <SectionTitle>Qué significa</SectionTitle>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-400">
          <li>
            Si dice <b>PRESENTE</b> pero el backend no te deja operar, tu token está vencido/invalidado: usá{" "}
            <b>Reset sesión</b>.
          </li>
          <li>
            Si hay token pero no hay user, el login guardó token pero no guardó user. Se arregla volviendo a loguear.
          </li>
        </ul>
      </Card>
    </Page>
  );
}
