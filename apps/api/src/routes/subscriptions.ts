// src/routes/subscriptions.routes.ts
import { Router } from "express";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/requireAuth";
import { SubscriptionModel } from "../db/models/subscription.js";
import { UserModel } from "../db/models/User.js";
import { TenantModel } from "../db/models/Tenant.js";
const r = Router();

/**
 * Helpers
 */
function assertObjectId(id: any) {
  return typeof id === "string" && Types.ObjectId.isValid(id);
}

function safeStatus(x: any): "PENDING" | "ACTIVE" | "REJECTED" | "CANCELED" | "ALL" {
  const v = String(x || "ALL").toUpperCase();
  if (["PENDING", "ACTIVE", "REJECTED", "CANCELED", "ALL"].includes(v)) return v as any;
  return "ALL";
}

/**
 * =====================================================
 * SUBSCRIBER SIDE
 * =====================================================
 */

/**
 * POST /subscriptions/request
 * body: { tenantId }
 */
r.post("/subscriptions/request", requireAuth, async (req, res) => {
  const subscriberUserId = req.user.id;
  const { tenantId } = req.body as { tenantId?: string };

  if (!assertObjectId(tenantId)) {
    return res.status(400).json({ error: "INVALID_TENANT_ID" });
  }

  const tenant = await TenantModel.findOne({
    _id: tenantId,
    status: "active",
  }).lean();

  if (!tenant) {
    return res.status(404).json({ error: "TENANT_NOT_FOUND" });
  }

  // No permitir suscribirse a su propio tenant
  if (String(tenant.ownerUserId) === String(subscriberUserId)) {
    return res.status(409).json({ error: "CANNOT_SUBSCRIBE_OWN_TENANT" });
  }

  const existing = await SubscriptionModel.findOne({
    tenantId,
    subscriberUserId,
  });

  if (!existing) {
    const created = await SubscriptionModel.create({
      tenantId,
      subscriberUserId,
      status: "PENDING",
      decidedAt: null,
      canceledAt: null,
    });
    return res.json({ subscription: created });
  }

  if (existing.status === "ACTIVE" || existing.status === "PENDING") {
    return res.json({ subscription: existing });
  }

  // Re-solicitar si estaba REJECTED o CANCELED
  existing.status = "PENDING";
  existing.decidedAt = null;
  existing.canceledAt = null;
  await existing.save();

  return res.json({ subscription: existing });
});

/**
 * GET /subscriptions/mine?status=...
 */
r.get("/subscriptions/mine", requireAuth, async (req, res) => {
  const subscriberUserId = req.user.id;
  const status = safeStatus(req.query.status);

  const filter: any = { subscriberUserId };
  if (status !== "ALL") filter.status = status;

  const subs = await SubscriptionModel.find(filter)
    .sort({ updatedAt: -1 })
    .lean();

  const tenantIds = subs.map((s) => s.tenantId);

  const tenants = await TenantModel.find({
    _id: { $in: tenantIds },
  })
    .select("_id name ownerUserId status")
    .lean();

  const ownerIds = tenants.map((t) => t.ownerUserId);

  const owners = await UserModel.find({
    _id: { $in: ownerIds },
  })
    .select("_id email planTier")
    .lean();

  const tenantById = new Map(tenants.map((t) => [String(t._id), t]));
  const ownerById = new Map(owners.map((u) => [String(u._id), u]));

  return res.json({
    subscriptions: subs
      .map((s) => {
        const tenant = tenantById.get(String(s.tenantId));
        if (!tenant) return null;

        return {
          subscriptionId: s._id,
          status: s.status,
          tenant: {
            _id: tenant._id,
            name: tenant.name,
            owner: ownerById.get(String(tenant.ownerUserId)) || null,
          },
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        };
      })
      .filter(Boolean),
  });
});

/**
 * GET /subscriptions/my-tenants?status=ACTIVE
 * Para el mapa
 */
r.get("/subscriptions/my-tenants", requireAuth, async (req, res) => {
  const subscriberUserId = req.user.id;
  const status = safeStatus(req.query.status);
  const effectiveStatus = status === "ALL" ? "ACTIVE" : status;

  const subs = await SubscriptionModel.find({
    subscriberUserId,
    status: effectiveStatus,
  }).lean();

  const tenantIds = subs.map((s) => s.tenantId);

  const tenants = await TenantModel.find({
    _id: { $in: tenantIds },
    status: "active",
  })
    .select("_id name ownerUserId")
    .lean();

  return res.json({
    tenants,
  });
});

/**
 * POST /subscriptions/:id/cancel
 */
r.post("/subscriptions/:id/cancel", requireAuth, async (req, res) => {
  const userId = req.user.id;

  const sub = await SubscriptionModel.findById(req.params.id);
  if (!sub) return res.status(404).json({ error: "NOT_FOUND" });

  const tenant = await TenantModel.findById(sub.tenantId).lean();
  if (!tenant) return res.status(404).json({ error: "TENANT_NOT_FOUND" });

  const isSubscriber = String(sub.subscriberUserId) === String(userId);
  const isOwner = String(tenant.ownerUserId) === String(userId);

  if (!isSubscriber && !isOwner) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  sub.status = "CANCELED";
  sub.canceledAt = new Date();
  await sub.save();

  return res.json({ subscription: sub });
});

/**
 * =====================================================
 * ANALYST (OWNER) ADMIN
 * =====================================================
 */

/**
 * GET /subscriptions/owner/requests?status=...
 */
r.get("/subscriptions/owner/requests", requireAuth, async (req, res) => {
  const ownerUserId = req.user.id;
  const status = safeStatus(req.query.status);

  const myTenants = await TenantModel.find({
    ownerUserId,
  })
    .select("_id name")
    .lean();

  const tenantIds = myTenants.map((t) => t._id);
  if (!tenantIds.length) return res.json({ subscriptions: [] });

  const filter: any = { tenantId: { $in: tenantIds } };
  if (status !== "ALL") filter.status = status;

  const subs = await SubscriptionModel.find(filter)
    .sort({ updatedAt: -1 })
    .lean();

  const subscriberIds = subs.map((s) => s.subscriberUserId);

  const subscribers = await UserModel.find({
    _id: { $in: subscriberIds },
  })
    .select("_id email planTier")
    .lean();

  const tenantById = new Map(myTenants.map((t) => [String(t._id), t]));
  const userById = new Map(subscribers.map((u) => [String(u._id), u]));

  return res.json({
    subscriptions: subs.map((s) => ({
      _id: s._id,
      status: s.status,
      tenant: tenantById.get(String(s.tenantId)) || null,
      subscriber: userById.get(String(s.subscriberUserId)) || null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
  });
});

/**
 * POST /subscriptions/:id/decide
 * body: { action: APPROVE|REJECT }
 */
r.post("/subscriptions/:id/decide", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { action } = req.body as { action?: "APPROVE" | "REJECT" };

  if (!["APPROVE", "REJECT"].includes(action || "")) {
    return res.status(400).json({ error: "INVALID_ACTION" });
  }

  const sub = await SubscriptionModel.findById(req.params.id);
  if (!sub) return res.status(404).json({ error: "NOT_FOUND" });

  const tenant = await TenantModel.findById(sub.tenantId).lean();
  if (!tenant) return res.status(404).json({ error: "TENANT_NOT_FOUND" });

  if (String(tenant.ownerUserId) !== String(userId)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  if (sub.status === "CANCELED") {
    return res.status(409).json({ error: "ALREADY_CANCELED" });
  }

  sub.status = action === "APPROVE" ? "ACTIVE" : "REJECTED";
  sub.decidedAt = new Date();
  await sub.save();

  return res.json({ subscription: sub });
});

export default r;