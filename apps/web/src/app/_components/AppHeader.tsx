"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearToken, getToken } from "../../lib/api";
import { getUser } from "../../lib/session";

const nav = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Mapa" },
  { href: "/analyst", label: "Analistas" },
  { href: "/account", label: "Cuenta" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [token, setTokenState] = useState<string | null>(null);
  const [userLabel, setUserLabel] = useState<string>("Invitado");

  const sync = () => {
    const t = getToken();
    setTokenState(t);

    const u = typeof window === "undefined" ? null : getUser();

    if (!t) {
      setUserLabel("Invitado");
      return;
    }

    if (u) {
      setUserLabel(`${u.globalRole} · ${u.email}`);
    } else {
      setUserLabel("Logueado");
    }
  };

  useEffect(() => {
    sync();
    window.addEventListener("auth-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("auth-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isLoggedIn = !!token;

  return (
    <header
      className={[
        "sticky top-0 z-50",
        // glass + separation
        "border-b border-slate-800/80",
        "bg-slate-950/70 backdrop-blur-xl",
        // subtle depth
        "shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
      ].join(" ")}
    >
      {/* top glow line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* LEFT */}
          <div className="flex items-center gap-6">
            <Link href="/" className="group flex items-center gap-2">
              {/* logo pill */}
              <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-cyan-500/25 to-blue-600/25 ring-1 ring-slate-700/60 shadow-inner" />
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-wide text-slate-50">
                mapeAR
                </div>
              </div>
            </Link>

            {/* NAV */}
            <nav className="hidden items-center gap-1 md:flex">
              {nav.map((item) => {
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "relative rounded-xl px-3 py-2 text-sm transition",
                      "focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:ring-offset-0",
                      active
                        ? "text-slate-50 bg-slate-900/50 ring-1 ring-slate-700/60"
                        : "text-slate-300 hover:text-slate-50 hover:bg-slate-900/30",
                    ].join(" ")}
                  >
                    {item.label}

                    {/* active underline */}
                    {active && (
                      <span className="absolute left-3 right-3 -bottom-[6px] h-[2px] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* user badge */}
            <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-800/70 bg-slate-900/40 px-3 py-1 text-xs text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
              {userLabel}
            </div>

            {!isLoggedIn ? (
              <Link
                href="/subscribe"
                className={[
                  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-white",
                  "bg-gradient-to-r from-cyan-500 to-blue-600",
                  "shadow-[0_10px_25px_rgba(0,0,0,0.35)]",
                  "hover:opacity-95 active:opacity-90 transition",
                  "focus:outline-none focus:ring-2 focus:ring-cyan-400/50",
                ].join(" ")}
              >
                Suscribite
              </Link>
            ) : (
              <button
                onClick={() => {
                  clearToken();
                  router.push("/");
                  router.refresh();
                }}
                className={[
                  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm",
                  "border border-slate-800/80 bg-slate-950/20 text-slate-200",
                  "hover:bg-slate-900/40 hover:text-white transition",
                  "focus:outline-none focus:ring-2 focus:ring-slate-500/40",
                ].join(" ")}
              >
                Logout
              </button>
            )}
          </div>
        </div>

        {/* mobile nav */}
        <div className="md:hidden pb-3">
          <div className="flex gap-1 overflow-x-auto">
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "whitespace-nowrap rounded-xl px-3 py-2 text-sm transition",
                    active
                      ? "bg-slate-900/60 text-slate-50 ring-1 ring-slate-700/60"
                      : "text-slate-300 hover:bg-slate-900/30 hover:text-slate-50",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
