import mongoose from "mongoose";

export const PLAN_TIERS = ["INVITED", "SUBSCRIBER", "SUBSCRIBER_PLUS"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

const LayerSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true }, // "geopolitica"
    name: { type: String, required: true }, // "Geopolítica"

    // Tier mínimo requerido para ver FULL en esta capa
    minTier: {
      type: String,
      enum: PLAN_TIERS,
      default: "INVITED",
      index: true,
    },

    // flags de producto
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const LayerModel = mongoose.model("Layer", LayerSchema);
export type LayerDoc = mongoose.InferSchemaType<typeof LayerSchema> & {
  _id: mongoose.Types.ObjectId;
};
