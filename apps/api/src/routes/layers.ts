import express from "express";
import { LayerModel } from "../db/models/Layers";
import { optionalAuth, AuthedReq } from "../middleware/optionalAuth";
import { hasTierAccess } from "../lib/tiers"; // <- ya lo tenés

const router = express.Router();

router.get("/", optionalAuth, async (req: AuthedReq, res) => {
  const userTier = req.user?.planTier || "INVITED";

  const layers = await LayerModel.find({ isActive: true })
    .sort({ sort: 1, title: 1 })
    .lean();

  const out = layers.map((l) => ({
    key: l.key,
    title: l.title,
    description: l.description,
    accessTier: l.accessTier,
    canAccess: hasTierAccess(l.accessTier, userTier),
  }));

  res.json({ layers: out, userTier });
});

export default router;
