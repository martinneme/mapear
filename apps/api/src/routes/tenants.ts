import express from "express";
const router = express.Router();

import { TenantModel } from "../db/models/Tenant.js";
import { requireAuth } from "../middleware/requireAuth.js";
import type { AuthedReq } from "../middleware/optionalAuth.js";

router.get("/me", requireAuth, async (req: AuthedReq, res) => {
  const tenant = await TenantModel.findOne({ ownerUserId: req.user!.id }).lean();
  if (!tenant) return res.status(404).json({ error: "TENANT_NOT_FOUND" });
  return res.json({ tenant });
});

export default router;
