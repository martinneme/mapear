import { Router } from "express";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/requireAuth";
import { UserModel } from "../../../api/src/db/models/User.js";
import {SubscriptionModel} from "../../../api/src/db/models/subscription.js";
import { TenantModel } from "../../../api/src/db/models/Tenant.js";

const r = Router();


/**
 * GET /analysts?query=...
 * Devuelve TENANTS suscribibles (canales de analistas)
 * - filtra por tenant.name (case-insensitive)
 * - excluye tenants con relación PENDING o ACTIVE del usuario logueado
 * - excluye tenants inactivos
 * - opcional: excluye mi propio tenant (si soy owner)
 */
r.get("/analysts", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const q = String(req.query.query || "").trim();

  // 1) Traer mis suscripciones PENDING/ACTIVE para excluir
  const myOpenSubs = await SubscriptionModel.find({
    subscriberUserId: userId,
    status: { $in: ["PENDING", "ACTIVE"] },
  })
    .select("tenantId")
    .lean();

  const excludedTenantIds = myOpenSubs.map((s) => s.tenantId);

  // 2) Excluir también los tenants que yo mismo poseo (para evitar suscribirse a sí mismo)
  const myOwnedTenants = await TenantModel.find({ ownerUserId: userId }).select("_id").lean();
  const myOwnedIds = myOwnedTenants.map((t) => t._id);

  const finalExcluded = [...excludedTenantIds, ...myOwnedIds];

  // 3) Buscar tenants activos por name
  const filter: any = { status: "active" };

  if (q) {
    filter.name = { $regex: q, $options: "i" };
  }
  
  if (finalExcluded.length > 0) {
    filter._id = {
      $nin: finalExcluded.map((id) =>
        typeof id === "string" ? new Types.ObjectId(id) : id
      ),
    };
  }

  const tenants = await TenantModel.find(filter)
    .select("_id name ownerUserId status")
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  // 4) Adjuntar info pública del owner (email + planTier)
  const ownerIds = tenants.map((t) => t.ownerUserId);
  const owners = await UserModel.find({ _id: { $in: ownerIds } })
    .select("_id email planTier globalRole")
    .lean();

  const ownerById = new Map(owners.map((u) => [String(u._id), u]));

  res.json({
    analysts: tenants.map((t) => ({
      tenantId: t._id,
      tenantName: t.name,
      ownerUserId: t.ownerUserId,
      ownerEmail: ownerById.get(String(t.ownerUserId))?.email || null,
      ownerPlanTier: ownerById.get(String(t.ownerUserId))?.planTier || null,
    })),
  });
});

export default r;