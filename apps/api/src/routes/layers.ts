import { Router } from "express";
import { LayerModel } from "../db/models/Layer.js";

export const layersRouter = Router();

layersRouter.get("/", async (_req, res) => {
  const layers = await LayerModel.find({ enabled: true }).sort({ order: 1 }).lean();

  return res.json({
    layers: layers.map((l) => ({
      id: String(l._id),
      key: l.key,
      name: l.name,
      minTier: l.minTier,
      order: l.order ?? 0,
    })),
  });
});
