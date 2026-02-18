"use client";

export default function CountryMap({
  onPick,
}: {
  onPick: (iso3: string, name?: string) => void;
}) {
  // ⚠️ Acá conectás tu mapa real:
  // - cuando el usuario hace click en un país, llamás onPick("ARG","Argentina")
  return (
    <div className="flex h-[420px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40">
      <button
        className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-2 text-slate-100 hover:bg-slate-900/70"
        onClick={() => onPick("ARG", "Argentina")}
      >
        (MVP) Click de prueba: Argentina
      </button>
    </div>
  );
}
