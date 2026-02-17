import Link from "next/link";
import { Card, Page, PageHeader, SectionTitle } from "./_components/Page";

function HomeCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-slate-800 bg-slate-950/40 p-5 hover:bg-slate-900/40"
    >
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-1 text-sm text-slate-400">{desc}</div>
      <div className="mt-4 text-sm text-slate-200">Abrir →</div>
    </Link>
  );
}

export default function HomePage() {
  return (
    <Page>
      <PageHeader title="Home" subtitle="Centro de navegación del producto." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <HomeCard title="Mapa" desc="Mapa" href="/map" />
        <HomeCard title="Analistas" desc="Analistas" href="/analysts" />
        <HomeCard title="Cuenta" desc="Plan / accesos / sesión." href="/account" />
      </div>

      <Card>
        <SectionTitle>Próximo</SectionTitle>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-400">
          <li>Países clickeables (ISO3) + panel de detalle</li>
          <li>Contenido por analista, por capa, con paywall (Invited / Subscriber / Plus)</li>
        </ul>
      </Card>
    </Page>
  );
}
