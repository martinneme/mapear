import "./globals.css";
import React from "react";
import RouteShell from "./route-shell";
import FooterShell from "./footer-shell";

export const metadata = { title: "mapeAR MVP" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-sky-500/30 to-indigo-500/20 ring-1 ring-slate-700/60" />
              <div>
                <div className="text-sm font-semibold tracking-wide">mapeAR</div>
                <div className="text-xs text-slate-400">MVP · Auth · Tenants · Subscribers</div>
              </div>
            </div>
            <div className="hidden sm:block text-xs text-slate-400">
              Local: <span className="badge">API :4000</span> <span className="badge">WEB :3000</span>
            </div>
          </div>
        </header>

        <RouteShell>{children}</RouteShell>

        <FooterShell>
  <footer className="mx-auto max-w-5xl px-4 pb-10 pt-6 text-xs text-slate-500">
    <div className="border-t border-slate-800 pt-6">
      Próximo: MapLibre (mapa), capas, contenido y sugerencias.
    </div>
  </footer>
</FooterShell>

      </body>
    </html>
  );
}