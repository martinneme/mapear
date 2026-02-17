import "./globals.css";
import React from "react";
import RouteShell from "./route-shell";

export const metadata = { title: "mapeAR MVP" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh bg-slate-950 text-slate-100">
        <RouteShell>{children}</RouteShell>
      </body>
    </html>
  );
}
