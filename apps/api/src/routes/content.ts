import { Router } from "express";
import mongoose from "mongoose";
import { LayerModel } from "../db/models/Layer.js";
import { PostModel } from "../db/models/Post.js";
import { TenantModel } from "../db/models/Tenant.js";
import { AccessGrantModel } from "../db/models/AccessGrant.js";
import { hasTierAccess, PlanTier } from "../lib/tiers.js";
import { AuthedRequest } from "../lib/authMiddleware.js";
import { verifyAccessToken } from "../lib/jwt.js";

export const contentRouter = Router();

/**
 * Auth opcional:
 * - Si viene Bearer válido -> req.user
 * - Si no viene / inválido -> anónimo (INVITED)
 */
function optionalAuth(req: AuthedRequest, _res: any, next: any) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();

  try {
    const p = verifyAccessToken(header.slice("Bearer ".length));
    req.user = { id: p.sub, role: p.role, planTier: p.planTier };
  } catch {
    // se ignora
  }

  next();
}

contentRouter.get("/", optionalAuth, async (req: AuthedRequest, res) => {
  const iso3 = String(req.query.iso3 || "").toUpperCase();
  const layerKey = String(req.query.layer || "");

  if (!iso3 || iso3.length !== 3) return res.status(400).json({ error: "Invalid iso3" });
  if (!layerKey) return res.status(400).json({ error: "Missing layer" });

  const layer = await LayerModel.findOne({ key: layerKey, enabled: true }).lean();
  if (!layer) return res.status(404).json({ error: "Layer not found" });

  const posts = await PostModel.find({
    countryIso3: iso3,
    layerKey,
    status: "published",
  })
    .sort({ publishedAt: -1 })
    .limit(50)
    .lean();

  const tenantIds = [...new Set(posts.map((p) => String(p.tenantId)))];

  const tenants = await TenantModel.find({
    _id: { $in: tenantIds.map((id) => new mongoose.Types.ObjectId(id)) },
  }).lean();

  const tenantMap = new Map<string, any>(tenants.map((t) => [String(t._id), t]));

  // Tier del usuario (anónimo = INVITED)
  const userTier: PlanTier = (req.user?.planTier as PlanTier) ?? "INVITED";

  // Si el layer requiere SUBSCRIBER o PLUS, hay que validar tier
  const tierOk = hasTierAccess(userTier, layer.minTier as PlanTier);

  // Si el user es subscriber (consumidor), traemos grants ACTIVE para esos tenants
  let grantMap = new Map<string, any>();
  if (req.user?.role === "SUBSCRIBER") {
    const grants = await AccessGrantModel.find({
      tenantId: { $in: tenantIds.map((id) => new mongoose.Types.ObjectId(id)) },
      subscriberUserId: new mongoose.Types.ObjectId(req.user.id),
      status: "ACTIVE",
    }).lean();

    grantMap = new Map(grants.map((g) => [String(g.tenantId), g]));
  }

  const items = posts.map((p) => {
    const tenantId = String(p.tenantId);
    const tenant = tenantMap.get(tenantId);

    // Dueño analista (si coincide ownerUserId) -> full siempre
    const isAnalystOwner =
      req.user?.role === "ANALYST" &&
      tenant &&
      String(tenant.ownerUserId) === req.user.id;

    // Grant: el subscriber tiene permiso para ese tenant?
    const hasActiveGrant =
      req.user?.role === "SUBSCRIBER" ? grantMap.has(tenantId) : false;

    // Regla final de acceso
    const canAccessFull =
      isAnalystOwner ||
      (layer.minTier === "INVITED") ||
      (req.user?.role === "SUBSCRIBER" && tierOk && hasActiveGrant);

    return {
      id: String(p._id),
      tenant: tenant ? { id: tenantId, name: tenant.name } : { id: tenantId, name: "Analista" },
      countryIso3: p.countryIso3,
      layerKey: p.layerKey,
      title: p.title,
      summary: p.summary,
      publishedAt: p.publishedAt,
      access: canAccessFull ? "full" : "locked",
      body: canAccessFull ? p.body : undefined,
      media: canAccessFull ? p.media : undefined,
      tags: p.tags ?? [],
    };
  });

  // Bonus: agrupado por analista para UI (panel)
  const byAnalyst = new Map<string, any[]>();
  for (const it of items) {
    const k = it.tenant.id;
    byAnalyst.set(k, [...(byAnalyst.get(k) ?? []), it]);
  }

  return res.json({
    countryIso3: iso3,
    layer: {
      id: String(layer._id),
      key: layer.key,
      name: layer.name,
      minTier: layer.minTier,
    },
    items,
    groups: [...byAnalyst.entries()].map(([tenantId, posts]) => ({
      tenantId,
      tenantName: posts[0]?.tenant?.name ?? "Analista",
      posts,
    })),
  });
});
