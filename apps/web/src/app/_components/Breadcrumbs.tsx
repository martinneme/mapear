"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function labelFor(segment: string) {
  if (segment === "maps") return "Mapa";
  if (segment === "analysts") return "Analistas";
  if (segment === "account") return "Cuenta";
  if (segment === "login") return "Login";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);

  const crumbs = [
    { href: "/", label: "Home" },
    ...parts.map((p, idx) => ({
      href: "/" + parts.slice(0, idx + 1).join("/"),
      label: labelFor(p),
    })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-2">
          {i > 0 && <span className="text-slate-600">/</span>}
          <Link href={c.href} className="hover:text-slate-200">
            {c.label}
          </Link>
        </span>
      ))}
    </div>
  );
}
