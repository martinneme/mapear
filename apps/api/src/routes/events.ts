import express from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { MapEventModel } from "../db/models/MapEvent.js";
import { LayerModel } from "../db/models/Layers.js";
import { optionalAuth } from "../middleware/optionalAuth.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAnalyst } from "../middleware/requireAnalyst.js";
import { hasTierAccess } from "../lib/tiers.js";

// ⬇️ AJUSTÁ ESTE IMPORT al path real de tu modelo
import { SubscriptionModel } from "../db/models/Subscription.js";
// y si tu modelo se llama distinto, cambialo acá

const router = express.Router();

const UpsertSchema = z.object({
  layerKey: z.string().min(1),
  kind: z.enum(["POINT", "LINE"]),
  iso3: z.string().trim().optional(),
  title: z.string().min(1),
  summary: z.string().optional(),
  visibility: z.enum(["FREE", "PAID"]).optional(),
  tags: z.array(z.string()).optional(),
  geometry: z
    .object({
      type: z.enum(["Point", "LineString"]),
      coordinates: z.any(),
    })
    .refine((g) => {
      if (g.type === "Point") return Array.isArray(g.coordinates) && g.coordinates.length === 2;
      if (g.type === "LineString") return Array.isArray(g.coordinates) && g.coordinates.length >= 2;
      return false;
    }, "Geometry inválida"),
});

function toObjectId(id: any) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  const s = String(id);
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : null;
}

/**
 * PUBLIC/SEMI: devuelve eventos como GeoJSON para dibujar en el mapa
 * GET /events?layer=conflicts&iso3=ARG&tenantId=<optional>
 *
 * - Si NO viene tenantId: devuelve eventos "globales" (todos los tenants) según reglas de plan/tier.
 * - Si viene tenantId: requiere sesión (auth) y valida que el usuario tenga suscripción ACTIVE a ese tenant
 *   (o sea el owner/analyst de ese tenant).
 */
router.get("/", optionalAuth, async (req: any, res) => {
  const layerKey = String(req.query.layer || "").trim();
  const iso3 = String(req.query.iso3 || "").trim().toUpperCase();
  const tenantIdRaw = String(req.query.tenantId || "").trim(); // ahora lo usamos en el mapa
  const tenantObjectId = tenantIdRaw ? toObjectId(tenantIdRaw) : null;

  if (!layerKey) return res.status(400).json({ error: "LAYER_REQUIRED" });
  if (tenantIdRaw && !tenantObjectId) return res.status(400).json({ error: "INVALID_TENANT_ID" });

  // validar capa + tier
  const layer = (await LayerModel.findOne({ key: layerKey, isActive: true }).lean()) as
    | { accessTier: "INVITED" | "SUBSCRIBER" | "SUBSCRIBER_PLUS" }
    | null;

  if (!layer) return res.status(404).json({ error: "LAYER_NOT_FOUND" });

  const userTier = req.user?.planTier || "INVITED";
  if (!hasTierAccess(layer.accessTier, userTier)) {
    return res.status(403).json({
      error: "PLAN_REQUIRED",
      requiredTier: layer.accessTier,
      userTier,
    });
  }

  // Si el usuario NO es invited, puede ver PAID. Si es invited, solo FREE.
  const allowPaid = userTier !== "INVITED";

  // 🔐 Si viene tenantId, exigir que esté logueado y tenga relación ACTIVE (o sea el owner)
  if (tenantObjectId) {
    if (!req.user?.id) return res.status(401).json({ error: "AUTH_REQUIRED" });

    const meUserId = toObjectId(req.user.id);
    if (!meUserId) return res.status(401).json({ error: "INVALID_USER_ID" });

    // Si sos analyst y tu tenant es el mismo => OK
    const myTenantObjectId = toObjectId(req.user.tenantId);
    const isOwnerTenant = myTenantObjectId && String(myTenantObjectId) === String(tenantObjectId);

    if (!isOwnerTenant) {
      // Validar suscripción ACTIVE: subscriberUserId -> tenantId
      const sub = await SubscriptionModel.findOne({
        subscriberUserId: meUserId,
        tenantId: tenantObjectId,
        status: "ACTIVE",
      })
        .select("_id")
        .lean();

      if (!sub) return res.status(403).json({ error: "SUBSCRIPTION_REQUIRED" });
    }
  }

  const q: any = { layerKey, isActive: true };
  if (iso3 && iso3.length === 3) q.iso3 = iso3;
  if (!allowPaid) q.visibility = "FREE";
  if (tenantObjectId) q.tenantId = tenantObjectId; // ✅ filtro por tenant para el mapa

  const docs = await MapEventModel.find(q).sort({ createdAt: -1 }).limit(1000).lean();

  const features = docs.map((d: any) => ({
    type: "Feature",
    geometry: d.geometry,
    properties: {
      id: String(d._id),
      _id: String(d._id),
      tenantId: d.tenantId ? String(d.tenantId) : "",
      authorUserId: d.authorUserId ? String(d.authorUserId) : "",
      kind: d.kind,
      title: d.title,
      summary: d.summary,
      visibility: d.visibility,
      iso3: d.iso3 || "",
      tags: d.tags || [],
      createdAt: d.createdAt,
    },
  }));

  res.json({ type: "FeatureCollection", features });
});

/**
 * ANALYST: listar mis eventos
 * GET /events/me
 */
router.get("/me", requireAuth, requireAnalyst, async (req: any, res) => {
  const tenantObjectId = toObjectId(req.user.tenantId);
  if (!tenantObjectId) return res.status(400).json({ error: "TENANT_REQUIRED_ON_USER" });

  const docs = await MapEventModel.find({ tenantId: tenantObjectId, isActive: true })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  res.json({
    items: docs.map((d: any) => ({
      id: String(d._id),
      layerKey: d.layerKey,
      kind: d.kind,
      iso3: d.iso3 || "",
      title: d.title,
      summary: d.summary,
      visibility: d.visibility,
      tags: d.tags || [],
      geometry: d.geometry,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
  });
});

/**
 * ANALYST: crear evento
 * POST /events/me
 */
router.post("/me", requireAuth, requireAnalyst, async (req: any, res) => {
  const tenantObjectId = toObjectId(req.user.tenantId);
  const authorObjectId = toObjectId(req.user.id);

  if (!tenantObjectId) return res.status(400).json({ error: "TENANT_REQUIRED_ON_USER" });
  if (!authorObjectId) return res.status(400).json({ error: "INVALID_USER_ID" });

  const parsed = UpsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const p = parsed.data;
  const iso3 = (p.iso3 || "").trim().toUpperCase();

  const doc = await MapEventModel.create({
    tenantId: tenantObjectId,          // ✅ siempre ObjectId
    authorUserId: authorObjectId,      // ✅ siempre ObjectId
    layerKey: p.layerKey,
    kind: p.kind,
    iso3,
    title: p.title,
    summary: p.summary || "",
    visibility: p.visibility || "FREE",
    tags: p.tags || [],
    geometry: p.geometry,
    isActive: true,
  });

  res.json({ id: String(doc._id) });
});

/**
 * ANALYST: editar evento
 * PUT /events/me/:id
 */
router.put("/me/:id", requireAuth, requireAnalyst, async (req: any, res) => {
  const tenantObjectId = toObjectId(req.user.tenantId);
  if (!tenantObjectId) return res.status(400).json({ error: "TENANT_REQUIRED_ON_USER" });

  const id = String(req.params.id || "");
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "INVALID_ID" });

  const parsed = UpsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const p = parsed.data;
  const iso3 = (p.iso3 || "").trim().toUpperCase();

  const updated = await MapEventModel.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(id), tenantId: tenantObjectId, isActive: true },
    {
      $set: {
        layerKey: p.layerKey,
        kind: p.kind,
        iso3,
        title: p.title,
        summary: p.summary || "",
        visibility: p.visibility || "FREE",
        tags: p.tags || [],
        geometry: p.geometry,
      },
    },
    { new: true }
  );

  if (!updated) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ ok: true });
});

/**
 * ANALYST: borrar (soft delete)
 * DELETE /events/me/:id
 */
router.delete("/me/:id", requireAuth, requireAnalyst, async (req: any, res) => {
  const tenantObjectId = toObjectId(req.user.tenantId);
  if (!tenantObjectId) return res.status(400).json({ error: "TENANT_REQUIRED_ON_USER" });

  const id = String(req.params.id || "");
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "INVALID_ID" });

  const updated = await MapEventModel.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(id), tenantId: tenantObjectId, isActive: true },
    { $set: { isActive: false } },
    { new: true }
  );

  if (!updated) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ ok: true });
});

export default router;
