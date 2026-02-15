import { Router } from "express";
import mongoose from "mongoose";
import { authRequired, AuthedRequest } from "../lib/authMiddleware.js";
import { TenantModel } from "../db/models/Tenant.js";
import { AccessGrantModel } from "../db/models/AccessGrant.js";
import { UserModel } from "../db/models/User.js";
import { updateGrantSchema } from "./validators.js";

export const tenantsRouter = Router();

// Helper: assert tenant owner
async function assertTenantOwner(tenantId: string, userId: string) {
  const tenant = await TenantModel.findById(tenantId).lean();
  if (!tenant) throw new Error("TENANT_NOT_FOUND");
  if (String(tenant.ownerUserId) !== userId) throw new Error("NOT_OWNER");
  return tenant;
}

// Get my tenant (analyst)
tenantsRouter.get("/me", authRequired, async (req: AuthedRequest, res) => {
  if (req.user?.role !== "ANALYST") return res.status(403).json({ error: "Only analysts have tenants" });
  const tenant = await TenantModel.findOne({ ownerUserId: req.user.id }).lean();
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });
  return res.json({ tenant: { id: String(tenant._id), name: tenant.name, status: tenant.status } });
});

// Subscriber requests access -> creates PENDING grant
tenantsRouter.post("/:tenantId/access-requests", authRequired, async (req: AuthedRequest, res) => {
  const { tenantId } = req.params;
  if (!mongoose.isValidObjectId(tenantId)) return res.status(400).json({ error: "Invalid tenantId" });

  if (req.user?.role !== "SUBSCRIBER") return res.status(403).json({ error: "Only subscribers can request access" });

  const tenant = await TenantModel.findById(tenantId).lean();
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const grant = await AccessGrantModel.findOneAndUpdate(
    { tenantId, subscriberUserId: req.user.id },
    { $setOnInsert: { status: "PENDING", allowedLayerIds: "ALL" } },
    { upsert: true, new: true }
  ).lean();

  return res.json({ grant });
});

// Analyst: list subscribers (grants)
tenantsRouter.get("/:tenantId/subscribers", authRequired, async (req: AuthedRequest, res) => {
  const { tenantId } = req.params;
  try {
    await assertTenantOwner(tenantId, req.user!.id);
  } catch (e: any) {
    if (e.message === "TENANT_NOT_FOUND") return res.status(404).json({ error: "Tenant not found" });
    return res.status(403).json({ error: "Not tenant owner" });
  }

  const grants = await AccessGrantModel.find({ tenantId }).sort({ updatedAt: -1 }).lean();
  const userIds = grants.map(g => g.subscriberUserId);
  const users = await UserModel.find({ _id: { $in: userIds } }, { email: 1, globalRole: 1 }).lean();
  const userMap = new Map(users.map(u => [String(u._id), u]));

  return res.json({
    subscribers: grants.map(g => ({
      ...g,
      _id: String(g._id),
      tenantId: String(g.tenantId),
      subscriberUserId: String(g.subscriberUserId),
      subscriber: userMap.get(String(g.subscriberUserId)) ? {
        id: String(g.subscriberUserId),
        email: (userMap.get(String(g.subscriberUserId)) as any).email,
      } : null,
    })),
  });
});

// Analyst: approve subscriber
tenantsRouter.post("/:tenantId/subscribers/:subscriberUserId/approve", authRequired, async (req: AuthedRequest, res) => {
  const { tenantId, subscriberUserId } = req.params;
  try {
    await assertTenantOwner(tenantId, req.user!.id);
  } catch {
    return res.status(403).json({ error: "Not tenant owner" });
  }

  const grant = await AccessGrantModel.findOneAndUpdate(
    { tenantId, subscriberUserId },
    { $set: { status: "ACTIVE" } },
    { upsert: true, new: true }
  ).lean();

  return res.json({ grant });
});

// Analyst: revoke subscriber
tenantsRouter.post("/:tenantId/subscribers/:subscriberUserId/revoke", authRequired, async (req: AuthedRequest, res) => {
  const { tenantId, subscriberUserId } = req.params;
  try {
    await assertTenantOwner(tenantId, req.user!.id);
  } catch {
    return res.status(403).json({ error: "Not tenant owner" });
  }

  const grant = await AccessGrantModel.findOneAndUpdate(
    { tenantId, subscriberUserId },
    { $set: { status: "REVOKED" } },
    { new: true }
  ).lean();

  if (!grant) return res.status(404).json({ error: "Grant not found" });
  return res.json({ grant });
});

// Analyst: update subscriber grant flags / allowed layers
tenantsRouter.put("/:tenantId/subscribers/:subscriberUserId", authRequired, async (req: AuthedRequest, res) => {
  const { tenantId, subscriberUserId } = req.params;
  try {
    await assertTenantOwner(tenantId, req.user!.id);
  } catch {
    return res.status(403).json({ error: "Not tenant owner" });
  }

  const parsed = updateGrantSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const grant = await AccessGrantModel.findOneAndUpdate(
    { tenantId, subscriberUserId },
    { $set: parsed.data },
    { new: true }
  ).lean();

  if (!grant) return res.status(404).json({ error: "Grant not found" });
  return res.json({ grant });
});
