import express from "express";
import { optionalAuth, AuthedReq } from "../middleware/optionalAuth.js";
import { LayerModel } from "../db/models/Layers.js";
import { ContentModel } from "../db/models/Content.js";
import { hasTierAccess } from "../lib/tiers.js";

const router = express.Router();
/**
 * GET /content?iso3=ARG&layer=conflicts_2026
 * Reglas:
 * - si no pasás tier de la capa => 403 PLAN_REQUIRED
 * - si item visibility=PAID y userTier=INVITED => no lo devuelve
 * - Fase 2: validar grant por tenant/analista
 */
router.get("/", optionalAuth, async (req: AuthedReq, res:any) => {
  const iso3 = String(req.query.iso3 || "").toUpperCase();
  const layerKey = String(req.query.layer || "");

  if (!iso3 || iso3.length !== 3) return res.status(400).json({ error: "iso3 requerido (3 letras)" });
  if (!layerKey) return res.status(400).json({ error: "layer requerido" });

  const layer = await LayerModel.findOne({ key: layerKey, isActive: true }).lean();
  if (!layer) return res.status(404).json({ error: "layer no encontrada" });

  const userTier = req.user?.planTier || "INVITED";
  if (!hasTierAccess(layer.accessTier, userTier)) {
    return res.status(403).json({
      error: "PLAN_REQUIRED",
      requiredTier: layer.accessTier,
      userTier,
      message: "Tu plan no habilita esta capa.",
    });
  }

  const allowPaid = userTier !== "INVITED";

  const q: any = { iso3, layerKey, isActive: true };
  if (!allowPaid) q.visibility = "FREE";

  const items = await ContentModel.find(q).sort({ publishedAt: -1 }).limit(50).lean();

  res.json({
    iso3,
    layerKey,
    userTier,
    items: items.map((c) => ({
      id: String(c._id),
      title: c.title,
      summary: c.summary,
      visibility: c.visibility,
      tags: c.tags,
      publishedAt: c.publishedAt,
      tenantId: String(c.tenantId),
    })),
  });
});

export default router;
