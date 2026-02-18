"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";
import { getUser } from "../../../lib/session";

type Kind = "POINT" | "LINE";
type Visibility = "FREE" | "PAID";

type EventItem = {
  id: string;
  layerKey: string;
  kind: Kind;
  iso3: string;
  title: string;
  summary: string;
  visibility: Visibility;
  tags: string[];
  geometry: { type: "Point" | "LineString"; coordinates: any };
  createdAt?: string;
};

function parseLineCoords(raw: string) {
  // espera: [[lng,lat],[lng,lat],...]
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v) || v.length < 2) return null;
    return v;
  } catch {
    return null;
  }
}

export default function AnalystEventsPage() {
  const user = useMemo(() => (typeof window === "undefined" ? null : getUser()), []);
  const isAnalyst = user?.globalRole === "ANALYST";

  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  // form
  const [layerKey, setLayerKey] = useState("conflicts_2026");
  const [kind, setKind] = useState<Kind>("POINT");
  const [iso3, setIso3] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("FREE");
  const [tags, setTags] = useState(""); // csv
  const [lng, setLng] = useState("-58.381");
  const [lat, setLat] = useState("-34.603");
  const [lineCoords, setLineCoords] = useState('[[-58.38,-34.60],[-20,-10],[10,10]]');

  const resetForm = () => {
    setEditingId(null);
    setKind("POINT");
    setIso3("");
    setTitle("");
    setSummary("");
    setVisibility("FREE");
    setTags("");
    setLng("-58.381");
    setLat("-34.603");
    setLineCoords('[[-58.38,-34.60],[-20,-10],[10,10]]');
  };

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = (await api.myEvents()) as { items: EventItem[] };
      setItems(data.items || []);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAnalyst) return;
    load();
  }, [isAnalyst]);

  if (!isAnalyst) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="card p-6">
          <div className="text-lg font-semibold">ABM de eventos</div>
          <div className="mt-2 text-slate-300">
            Este panel es solo para usuarios <b>ANALYST</b>.
          </div>
        </div>
      </div>
    );
  }

  const onEdit = (it: EventItem) => {
    setEditingId(it.id);
    setLayerKey(it.layerKey);
    setKind(it.kind);
    setIso3(it.iso3 || "");
    setTitle(it.title);
    setSummary(it.summary || "");
    setVisibility(it.visibility || "FREE");
    setTags((it.tags || []).join(", "));

    if (it.geometry?.type === "Point") {
      setLng(String(it.geometry.coordinates?.[0] ?? ""));
      setLat(String(it.geometry.coordinates?.[1] ?? ""));
    } else {
      setLineCoords(JSON.stringify(it.geometry.coordinates || []));
    }
  };

  const onSubmit = async () => {
    setErr("");

    const tagsArr = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const iso = iso3.trim().toUpperCase();
    if (iso && iso.length !== 3) return setErr("ISO3 debe ser 3 letras (ej: ARG) o vacío.");

    let geometry: any;
    if (kind === "POINT") {
      const x = Number(lng);
      const y = Number(lat);
      if (Number.isNaN(x) || Number.isNaN(y)) return setErr("Lng/Lat inválidos.");
      geometry = { type: "Point", coordinates: [x, y] };
    } else {
      const coords = parseLineCoords(lineCoords);
      if (!coords) return setErr("Line coords inválidas. Usá formato JSON: [[lng,lat],[lng,lat]]");
      geometry = { type: "LineString", coordinates: coords };
    }

    const payload = {
      layerKey,
      kind,
      iso3: iso,
      title,
      summary,
      visibility,
      tags: tagsArr,
      geometry,
    };

    try {
      if (editingId) {
        await api.updateMyEvent(editingId, payload);
      } else {
        await api.createMyEvent(payload);
      }
      resetForm();
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  };

  const onDelete = async (id: string) => {
    setErr("");
    try {
      await api.deleteMyEvent(id);
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-4">
        <div className="text-xl font-semibold text-slate-50">ABM de eventos (Analista)</div>
        <div className="text-sm text-slate-400">
          Cargá puntos (conflictos) y líneas (rutas) para que se dibujen en el mapa.
        </div>
      </div>

      {err ? (
        <div className="mb-4 rounded-2xl border border-rose-900/40 bg-rose-950/20 p-4 text-rose-200">
          {err}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        {/* LIST */}
        <section className="card p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Mis eventos</div>
            <button className="secondary" onClick={load}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="mt-3 text-slate-400">Cargando…</div>
          ) : null}

          <div className="mt-4 grid gap-2">
            {items.length === 0 ? (
              <div className="text-slate-400">Todavía no cargaste eventos.</div>
            ) : (
              items.map((it) => (
                <div key={it.id} className="rounded-2xl border border-slate-800 bg-slate-950/20 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-100">{it.title}</div>
                      <div className="text-xs text-slate-400">
                        {it.kind} · layer: {it.layerKey} · {it.iso3 ? `iso3: ${it.iso3} · ` : ""}
                        {it.visibility}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="secondary" onClick={() => onEdit(it)}>
                        Editar
                      </button>
                      <button className="secondary" onClick={() => onDelete(it.id)}>
                        Borrar
                      </button>
                    </div>
                  </div>

                  {it.summary ? <div className="mt-2 text-sm text-slate-300">{it.summary}</div> : null}
                </div>
              ))
            )}
          </div>
        </section>

        {/* FORM */}
        <aside className="card p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{editingId ? "Editar evento" : "Nuevo evento"}</div>
            {editingId ? (
              <button className="secondary" onClick={resetForm}>
                Cancelar
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3">
            <label className="text-sm text-slate-300">
              LayerKey
              <input value={layerKey} onChange={(e) => setLayerKey(e.currentTarget.value)} />
            </label>

            <label className="text-sm text-slate-300">
              Tipo
              <select value={kind} onChange={(e) => setKind(e.currentTarget.value as Kind)}>
                <option value="POINT">POINT (conflicto)</option>
                <option value="LINE">LINE (ruta)</option>
              </select>
            </label>

            <label className="text-sm text-slate-300">
              ISO3 (opcional)
              <input value={iso3} onChange={(e) => setIso3(e.currentTarget.value)} placeholder="ARG" />
            </label>

            <label className="text-sm text-slate-300">
              Título
              <input value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
            </label>

            <label className="text-sm text-slate-300">
              Resumen
              <textarea value={summary} onChange={(e) => setSummary(e.currentTarget.value)} rows={3} />
            </label>

            <label className="text-sm text-slate-300">
              Visibilidad
              <select value={visibility} onChange={(e) => setVisibility(e.currentTarget.value as Visibility)}>
                <option value="FREE">FREE</option>
                <option value="PAID">PAID</option>
              </select>
            </label>

            <label className="text-sm text-slate-300">
              Tags (comma)
              <input value={tags} onChange={(e) => setTags(e.currentTarget.value)} placeholder="rusia, otan, energia" />
            </label>

            {kind === "POINT" ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-slate-300">
                  Lng
                  <input value={lng} onChange={(e) => setLng(e.currentTarget.value)} />
                </label>
                <label className="text-sm text-slate-300">
                  Lat
                  <input value={lat} onChange={(e) => setLat(e.currentTarget.value)} />
                </label>
              </div>
            ) : (
              <label className="text-sm text-slate-300">
                Coordinates JSON (LineString)
                <textarea value={lineCoords} onChange={(e) => setLineCoords(e.currentTarget.value)} rows={5} />
              </label>
            )}

            <button onClick={onSubmit}>
              {editingId ? "Guardar cambios" : "Crear evento"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
