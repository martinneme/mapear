"use client";

import { usePathname } from "next/navigation";

export default function RouteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMap = pathname?.startsWith("/map");

  if (isMap) {
    return (
      <main style={{ height: "calc(100vh - 80px)", padding: 8 }}>
        {children}
      </main>
    );
  }
  

  return <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>;
}
