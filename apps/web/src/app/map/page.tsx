"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { Map } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";

type LayerKey = "conflicts" | "trade";

const DEMO_CONFLICTS = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { title: "Tensión / conflicto (demo)", country: "X" }, geometry: { type: "Point", coordinates: [35, 32] } },
    { type: "Feature", properties: { title: "Protestas / crisis (demo)", country: "Y" }, geometry: { type: "Point", coordinates: [44, 33] } },
    { type: "Feature", properties: { title: "Escalada (demo)", country: "Z" }, geometry: { type: "Point", coordinates: [-74, 4] } },
  ],
} as const;

const DEMO_TRADE = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { title: "Ruta comercial (demo)" },
      geometry: { type: "LineString", coordinates: [[-3, 40], [10, 50], [30, 55]] },
    },
    {
      type: "Feature",
      properties: { title: "Ruta energética (demo)" },
      geometry: { type: "LineString", coordinates: [[-58, -34], [-20, -10], [10, 10]] },
    },
  ],
} as const;

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    conflicts: true,
    trade: false,
  });

  const [drawer, setDrawer] = useState<null | { title: string; country?: string; coords?: string }>(null);

  const activeCount = useMemo(() => Object.values(layers).filter(Boolean).length, [layers]);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [0, 20],
      zoom: 2.2,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("load", () => {
      // Conflicts layer (points)
      map.addSource("conflicts-src", { type: "geojson", data: DEMO_CONFLICTS as any });
      map.addLayer({
        id: "conflicts-layer",
        type: "circle",
        source: "conflicts-src",
        paint: {
          "circle-radius": 7,
          "circle-color": "#ef4444",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#0b1220",
          "circle-opacity": 0.95,
        },
      });

      // Trade layer (lines)
      map.addSource("trade-src", { type: "geojson", data: DEMO_TRADE as any });
      map.addLayer({
        id: "trade-layer",
        type: "line",
        source: "trade-src",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-width": 3,
          "line-color": "#38bdf8",
          "line-opacity": 0.9,
        },
      });
      mapRef.current = map;
      // Default visibility from state
      map.setLayoutProperty("trade-layer", "visibility", layers.trade ? "visible" : "none");
      map.setLayoutProperty("conflicts-layer", "visibility", layers.conflicts ? "visible" : "none");

      // Click handler for points -> drawer
      map.on("click", "conflicts-layer", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = (f.properties || {}) as any;
        const c = (f.geometry as any)?.coordinates;
        setDrawer({
          title: p.title || "Evento",
          country: p.country,
          coords: Array.isArray(c) ? `${c[1].toFixed(2)}, ${c[0].toFixed(2)}` : undefined,
        });
      });

      map.on("mouseenter", "conflicts-layer", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "conflicts-layer", () => (map.getCanvas().style.cursor = ""));
    });

  
    return () => map.remove();
  }, []);

  // Sync layer toggles -> map visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("conflicts-layer")) map.setLayoutProperty("conflicts-layer", "visibility", layers.conflicts ? "visible" : "none");
    if (map.getLayer("trade-layer")) map.setLayoutProperty("trade-layer", "visibility", layers.trade ? "visible" : "none");
  }, [layers]);

  return (
    <div
  style={{
    height: "100%",
    display: "grid",
    gridTemplateColumns: drawer ? "240px 1fr 360px" : "240px 1fr",
    gap: 12,
  }}
>
      {/* Sidebar */}
      <aside className="card" style={{ padding: 16, overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Capas</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>Exploración</div>
          </div>
          <span className="badge">{activeCount} activas</span>
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
              <div style={{ fontWeight: 600 }}>Conflictos</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Puntos (demo) + click</div>
            </div>
            <input
              type="checkbox"
              checked={layers.conflicts}
              onChange={(e) => setLayers((s) => ({ ...s, conflicts: e.target.checked }))}
            />
          </label>
  
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
              <div style={{ fontWeight: 600 }}>Comercio</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Rutas (demo)</div>
            </div>
            <input
              type="checkbox"
              checked={layers.trade}
              onChange={(e) => setLayers((s) => ({ ...s, trade: e.target.checked }))}
            />
          </label>
  
          <div
            style={{
              border: "1px solid #1e293b",
              borderRadius: 16,
              padding: 14,
              background: "rgba(2,6,23,0.3)",
              fontSize: 13,
              opacity: 0.9,
            }}
          >
            Próximo: países clickeables + contenido por analista + pay/free por capa.
          </div>
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
          <button
            className="secondary"
            onClick={() => {
              mapRef.current?.flyTo({ center: [-58.38, -34.6], zoom: 4.2 });
            }}
          >
            Ir a AR (demo)
          </button>
        </div>
  
        {/* IMPORTANT: el contenedor del mapa ocupa TODO */}
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
      <div style={{ border: "1px solid #1e293b", borderRadius: 16, padding: 14, background: "rgba(2,6,23,0.3)" }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Título</div>
        <div style={{ marginTop: 6, fontWeight: 600 }}>{drawer.title}</div>
      </div>

      <div style={{ border: "1px solid #1e293b", borderRadius: 16, padding: 14, background: "rgba(2,6,23,0.3)" }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>País (demo)</div>
        <div style={{ marginTop: 6 }}>{drawer.country ?? "-"}</div>
      </div>

      <div style={{ border: "1px solid #1e293b", borderRadius: 16, padding: 14, background: "rgba(2,6,23,0.3)" }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Coordenadas</div>
        <div style={{ marginTop: 6, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
          {drawer.coords ?? "-"}
        </div>
      </div>
    </div>
  </aside>
)}
    </div>
  );  
}
