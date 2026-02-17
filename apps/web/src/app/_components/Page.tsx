import React from "react";

export function Page({ children }: { children: React.ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 shadow-sm">
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-semibold text-slate-200">{children}</div>;
}

export function Button({
  children,
  onClick,
  href,
  variant = "default",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "ghost" | "danger";
  type?: "button" | "submit";
}) {
  const cls =
    variant === "danger"
      ? "border-red-900/60 bg-red-950/30 text-red-200 hover:bg-red-950/50"
      : variant === "ghost"
      ? "border-slate-800 bg-slate-950/10 text-slate-200 hover:bg-slate-900/40"
      : "border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/50";

  if (href) {
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    return (
      <a className={`rounded-xl border px-3 py-2 text-sm ${cls}`} href={href}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} className={`rounded-xl border px-3 py-2 text-sm ${cls}`}>
      {children}
    </button>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" }) {
  const cls =
    tone === "ok"
      ? "border-emerald-900/60 bg-emerald-950/30 text-emerald-200"
      : "border-slate-800 bg-slate-950/40 text-slate-300";
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${cls}`}>{children}</span>;
}
