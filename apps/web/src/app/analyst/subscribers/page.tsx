import { Card, Page, PageHeader, SectionTitle } from "../../_components/Page";

export default function AnalystsPage() {
  return (
    <Page>
      <PageHeader title="Analistas" subtitle="Búsqueda por nombre y perfil por analista." />

      <Card>
        <SectionTitle>Próximo</SectionTitle>
        <p className="mt-2 text-sm text-slate-400">
          Vamos a listar analistas (tenants) y permitir buscar por nombre y apellido. Al entrar al perfil,
          se ve su contenido por países/capas.
        </p>
      </Card>
    </Page>
  );
}
