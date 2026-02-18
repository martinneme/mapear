"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { Map } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";

type PlanTier = "INVITED" | "SUBSCRIBER" | "SUBSCRIBER_PLUS";

type Layer = {
  key: string;
  title: string;
  description: string;
  accessTier: PlanTier;
  canAccess: boolean;
};

type EventProps = {
  id?: string;
  _id?: string; // Mongo
  kind?: "POINT" | "LINE";
  title?: string;
  summary?: string;
  visibility?: "FREE" | "PAID";
  iso3?: string;
  tags?: string[];
  createdAt?: string;
  authorUserId?: string; // lo dejamos por compat (si existe)
  tenantId?: string; // opcional si lo mandás desde backend
};

type GeoJSON = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point" | "LineString"; coordinates: any };
    properties: EventProps;
  }>;
};

type TenantRef = {
  _id: string;
  name: string;
  ownerUserId?: string;
};

const EMPTY_GEOJSON: GeoJSON = { type: "FeatureCollection", features: [] };

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  // Mongo layers (pay/free por capa)
  const [mongoLayers, setMongoLayers] = useState<Layer[]>([]);
  const [userTier, setUserTier] = useState<PlanTier>("INVITED");
  const [activeLayerKey, setActiveLayerKey] = useState<string>("");

  // Toggle (solo mongo)
  const [layerOn, setLayerOn] = useState(true);

  // Filtro por país
  const [iso3Filter, setIso3Filter] = useState<string>("");

  // Filtro por tenant (solo relaciones ACTIVE)
  const [myTenants, setMyTenants] = useState<TenantRef[]>([]);
  const [tenantFilter, setTenantFilter] = useState<string>(""); // tenantId

  // Drawer + lista de eventos actuales
  const [drawer, setDrawer] = useState<null | { countryName?: string; iso3?: string; coords?: string }>(null);
  const [eventsGeo, setEventsGeo] = useState<GeoJSON>(EMPTY_GEOJSON);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [mapReady, setMapReady] = useState(false);

  const activeMongoLayer = useMemo(
    () => mongoLayers.find((l) => l.key === activeLayerKey) || null,
    [mongoLayers, activeLayerKey]
  );

  // Load mongo layers once
  useEffect(() => {
    (async () => {
      const data = await api.layers();
      const layers = (data as any).layers || [];
      setMongoLayers(layers);
      setUserTier(((data as any).userTier as PlanTier) || "INVITED");

      const firstAccessible = layers.find((l: Layer) => l.canAccess) || layers[0];
      setActiveLayerKey(firstAccessible?.key || "");
    })().catch(console.error);
  }, []);

  // ✅ Load my ACTIVE tenants (for filter)
  useEffect(() => {
    api
      .myTenants("ACTIVE")
      .then((d: any) => setMyTenants((d?.tenants || []) as TenantRef[]))
      .catch(() => setMyTenants([]));
  }, []);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [0, 20],
      zoom: 2.2,
    });

    mapRef.current = map;

    const onCountriesMove = (e: any) => {
      const m = mapRef.current;
      if (!m) return;
      const f = e.features?.[0];
      if (!f) return;
      const iso3 = ((f.properties as any)?.ISO_A3 || (f.properties as any)?.ADM0_A3 || "").toUpperCase();
      if (m.getLayer("countries-hover")) {
        m.setFilter("countries-hover", ["==", ["get", "ISO_A3"], iso3]);
      }
      m.getCanvas().style.cursor = "pointer";
    };

    const onCountriesLeave = () => {
      const m = mapRef.current;
      if (!m) return;
      if (m.getLayer("countries-hover")) {
        m.setFilter("countries-hover", ["==", ["get", "ISO_A3"], ""]);
      }
      m.getCanvas().style.cursor = "";
    };

    const onCountriesClick = (e: any) => {
      const f = e.features?.[0];
      if (!f) return;

      const props: any = f.properties || {};
      const iso3 = (props.ISO_A3 || props.ADM0_A3 || "").toUpperCase();
      const name = props.NAME || props.ADMIN || props.name || iso3;

      setDrawer({
        iso3,
        countryName: name,
        coords: e.lngLat ? `${e.lngLat.lng.toFixed(3)}, ${e.lngLat.lat.toFixed(3)}` : undefined,
      });

      if (iso3 && iso3.length === 3) setIso3Filter(iso3);
    };

    const onEventsPointClick = (ev: any) => {
      const f = ev.features?.[0];
      if (!f) return;
      const p = (f.properties || {}) as any;
      const c = (f.geometry as any)?.coordinates as [number, number] | undefined;

      setDrawer({
        iso3: p.iso3 || undefined,
        countryName: p.title || p.iso3 || "Evento",
        coords: c ? `${c[0].toFixed(3)}, ${c[1].toFixed(3)}` : undefined,
      });
    };

    const onEventsPointEnter = () => (map.getCanvas().style.cursor = "pointer");
    const onEventsPointLeave = () => (map.getCanvas().style.cursor = "");

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    const onMapLoad = async () => {
      // --- Countries (clickable) ---
      try {
        const hasCountriesSource = !!map.getSource("countries-src");
        const hasFill = !!map.getLayer("countries-fill");
        const hasLine = !!map.getLayer("countries-line");
        const hasHover = !!map.getLayer("countries-hover");

        if (!hasCountriesSource) {
          const r = await fetch("/data/countries.geojson");
          if (!r.ok) throw new Error(`countries.geojson ${r.status}`);
          const countries = await r.json();
          map.addSource("countries-src", { type: "geojson", data: countries });
        }

        if (!hasFill) {
          map.addLayer({
            id: "countries-fill",
            type: "fill",
            source: "countries-src",
            paint: {
              "fill-color": "rgba(99,102,241,0.12)",
              "fill-outline-color": "rgba(148,163,184,0.25)",
            },
          });
        }

        if (!hasLine) {
          map.addLayer({
            id: "countries-line",
            type: "line",
            source: "countries-src",
            paint: { "line-width": 0.8, "line-color": "rgba(148,163,184,0.35)" },
          });
        }

        if (!hasHover) {
          map.addLayer({
            id: "countries-hover",
            type: "fill",
            source: "countries-src",
            paint: {
              "fill-color": "rgba(34,211,238,0.18)",
              "fill-outline-color": "rgba(34,211,238,0.35)",
            },
            filter: ["==", ["get", "ISO_A3"], ""],
          });
        }

        // Evitar duplicar listeners (HMR/StrictMode)
        map.off("mousemove", "countries-fill", onCountriesMove as any);
        map.off("mouseleave", "countries-fill", onCountriesLeave as any);
        map.off("click", "countries-fill", onCountriesClick as any);

        map.on("mousemove", "countries-fill", onCountriesMove as any);
        map.on("mouseleave", "countries-fill", onCountriesLeave as any);
        map.on("click", "countries-fill", onCountriesClick as any);
      } catch (e) {
        console.warn("No se pudo cargar /data/countries.geojson", e);
      }

      // --- Mongo events source/layers ---
      if (!map.getSource("events-src")) {
        map.addSource("events-src", { type: "geojson", data: EMPTY_GEOJSON as any });
      }

      if (!map.getLayer("events-points")) {
        map.addLayer({
          id: "events-points",
          type: "circle",
          source: "events-src",
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-radius": 7,
            "circle-color": "#ef4444",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#0b1220",
            "circle-opacity": 0.95,
          },
        });
      }

      if (!map.getLayer("events-lines")) {
        map.addLayer({
          id: "events-lines",
          type: "line",
          source: "events-src",
          filter: ["==", ["geometry-type"], "LineString"],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-width": 3,
            "line-color": "#38bdf8",
            "line-opacity": 0.9,
          },
        });
      }

      // Evitar duplicar listeners
      map.off("click", "events-points", onEventsPointClick as any);
      map.off("mouseenter", "events-points", onEventsPointEnter as any);
      map.off("mouseleave", "events-points", onEventsPointLeave as any);

      map.on("click", "events-points", onEventsPointClick as any);
      map.on("mouseenter", "events-points", onEventsPointEnter as any);
      map.on("mouseleave", "events-points", onEventsPointLeave as any);

      setMapReady(true);
    };

    map.on("load", onMapLoad);

    return () => {
      try {
        map.off("load", onMapLoad);
      } catch {}
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Load events from Mongo when filters change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const setVis = (id: string, on: boolean) => {
      if (!map.getLayer(id)) return;
      map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    };

    if (!layerOn || !activeLayerKey) {
      setVis("events-points", false);
      setVis("events-lines", false);
      setEventsGeo(EMPTY_GEOJSON);
      setEventsError("");
      const src = map.getSource("events-src") as any;
      if (src?.setData) src.setData(EMPTY_GEOJSON);
      return;
    }

    if (activeMongoLayer && !activeMongoLayer.canAccess) {
      setVis("events-points", false);
      setVis("events-lines", false);
      setEventsGeo(EMPTY_GEOJSON);
      setEventsError(`PLAN_REQUIRED (${activeMongoLayer.accessTier})`);
      const src = map.getSource("events-src") as any;
      if (src?.setData) src.setData(EMPTY_GEOJSON);
      return;
    }

    setVis("events-points", true);
    setVis("events-lines", true);

    setEventsLoading(true);
    setEventsError("");

    // ✅ 3er parámetro ahora es TENANT ID (no authorUserId)
    api
      .eventsGeo(activeLayerKey, iso3Filter ? iso3Filter : undefined, tenantFilter ? tenantFilter : undefined)
      .then((geo: any) => {
        const safe: GeoJSON = geo?.type === "FeatureCollection" ? geo : EMPTY_GEOJSON;
        setEventsGeo(safe);
        const src = map.getSource("events-src") as any;
        if (src?.setData) src.setData(safe);
      })
      .catch((e: any) => {
        setEventsError(String(e?.message || e));
        const src = map.getSource("events-src") as any;
        if (src?.setData) src.setData(EMPTY_GEOJSON);
        setEventsGeo(EMPTY_GEOJSON);
      })
      .finally(() => setEventsLoading(false));
  }, [
    mapReady,
    layerOn,
    activeLayerKey,
    iso3Filter,
    tenantFilter,
    activeMongoLayer?.canAccess,
    activeMongoLayer?.accessTier,
  ]);

  const visibleEvents = useMemo(() => {
    return (eventsGeo.features || [])
      .map((f) => f.properties || {})
      .filter(Boolean)
      .slice(0, 50);
  }, [eventsGeo]);

  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        gridTemplateColumns: drawer ? "280px 1fr 420px" : "280px 1fr",
        gap: 12,
      }}
    >
      {/* Sidebar */}
      <aside className="card" style={{ padding: 16, overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Capas</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>Exploración (Mongo)</div>
          </div>
          <span className="badge">Plan: {userTier}</span>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: "1px solid #1e293b",
              borderRadius: 16,
              padding: "12px 14px",
              background: "rgba(2,6,23,0.3)",
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>Eventos (Mongo)</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Puntos y rutas reales</div>
            </div>
            <input type="checkbox" checked={layerOn} onChange={(e) => setLayerOn(e.target.checked)} />
          </label>

          {/* Layer select */}
          <div
            style={{
              border: "1px solid #1e293b",
              borderRadius: 16,
              padding: 14,
              background: "rgba(2,6,23,0.3)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>Capa activa</div>
            <select
              value={activeLayerKey}
              onChange={(e) => setActiveLayerKey(e.target.value)}
              style={{ width: "100%", marginTop: 10 }}
            >
              {mongoLayers.map((l) => (
                <option key={l.key} value={l.key} disabled={!l.canAccess}>
                  {l.title} {l.canAccess ? "" : ` (🔒 ${l.accessTier})`}
                </option>
              ))}
            </select>

            {activeMongoLayer?.description ? (
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>{activeMongoLayer.description}</div>
            ) : null}

            {!activeMongoLayer?.canAccess && activeMongoLayer ? (
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>
                Esta capa requiere <b>{activeMongoLayer.accessTier}</b>.
              </div>
            ) : null}
          </div>

          {/* Tenant filter */}
          <div
            style={{
              border: "1px solid #1e293b",
              borderRadius: 16,
              padding: 14,
              background: "rgba(2,6,23,0.3)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>Analistas suscritos (tenants activos)</div>
            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              style={{ width: "100%", marginTop: 10 }}
            >
              <option value="">Todos</option>
              {myTenants.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
              Tip: solo aparecen tenants donde tu relación es <b>ACTIVE</b>.
            </div>
          </div>

          {/* ISO3 filter */}
          <div
            style={{
              border: "1px solid #1e293b",
              borderRadius: 16,
              padding: 14,
              background: "rgba(2,6,23,0.3)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Filtro ISO3</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>{iso3Filter ? iso3Filter : "MUNDO"}</div>
              </div>
              <button className="secondary" onClick={() => setIso3Filter("")}>
                Ver mundo
              </button>
            </div>

            <input
              value={iso3Filter}
              onChange={(e) => setIso3Filter(e.currentTarget.value.toUpperCase().slice(0, 3))}
              placeholder="ARG"
              style={{ marginTop: 10 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
              Tip: click en un país para setear el ISO3 automáticamente.
            </div>
          </div>

          {eventsError ? (
            <div
              style={{
                border: "1px solid rgba(244,63,94,.35)",
                borderRadius: 16,
                padding: 12,
                background: "rgba(127,29,29,.25)",
              }}
            >
              {eventsError}
            </div>
          ) : null}
        </div>
      </aside>

      {/* Map */}
      <section className="card" style={{ position: "relative", overflow: "hidden", minHeight: 0 }}>
        <div style={{ position: "absolute", left: 12, top: 12, zIndex: 10, display: "flex", gap: 8 }}>
          <button
            className="secondary"
            onClick={() => {
              mapRef.current?.flyTo({ center: [0, 20], zoom: 2.2 });
              setDrawer(null);
            }}
          >
            Reset view
          </button>
          <span className="badge">{eventsLoading ? "cargando…" : `${eventsGeo.features.length} eventos`}</span>
        </div>

        <div style={{ position: "absolute", inset: 0 }}>
          <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
        </div>
      </section>

      {/* Drawer */}
      {drawer && (
        <aside className="card" style={{ padding: 16, overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Detalle</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>Panel</div>
            </div>
            <button className="secondary" onClick={() => setDrawer(null)}>
              Cerrar
            </button>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12, fontSize: 14 }}>
            <div
              style={{
                border: "1px solid #1e293b",
                borderRadius: 16,
                padding: 14,
                background: "rgba(2,6,23,0.3)",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7 }}>Selección</div>
              <div style={{ marginTop: 6, fontWeight: 700 }}>{drawer.countryName || "País"}</div>
              {drawer.iso3 ? (
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                  ISO3:{" "}
                  <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{drawer.iso3}</span>
                </div>
              ) : null}
              {drawer.coords ? (
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                  Coord:{" "}
                  <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{drawer.coords}</span>
                </div>
              ) : null}
            </div>

            <div
              style={{
                border: "1px solid #1e293b",
                borderRadius: 16,
                padding: 14,
                background: "rgba(2,6,23,0.3)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Eventos cargados</div>
                  <div style={{ marginTop: 6, fontWeight: 700 }}>{activeMongoLayer?.title || activeLayerKey}</div>
                </div>
                <span className="badge">{eventsLoading ? "cargando…" : `${visibleEvents.length}`}</span>
              </div>

              {visibleEvents.length === 0 && !eventsLoading ? (
                <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>No hay eventos para este filtro.</div>
              ) : null}

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {visibleEvents.map((p, idx) => {
                  const key = String(p.id || p._id || idx);
                  return (
                    <div
                      key={key}
                      style={{
                        border: "1px solid #1e293b",
                        borderRadius: 14,
                        padding: 12,
                        background: "rgba(2,6,23,0.22)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 700 }}>{p.title || "Evento"}</div>
                        <span className="badge">{p.visibility || "FREE"}</span>
                      </div>
                      {p.summary ? <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>{p.summary}</div> : null}
                      {p.tags?.length ? (
                        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {p.tags.slice(0, 8).map((t) => (
                            <span key={t} className="badge">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
