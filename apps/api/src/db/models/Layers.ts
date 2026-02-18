import mongoose, { Schema, InferSchemaType } from "mongoose";

const LayerSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true }, // ej: "conflicts_2026"
    title: { type: String, required: true },
    description: { type: String, default: "" },

    // INVITED | SUBSCRIBER | SUBSCRIBER_PLUS
    accessTier: {
      type: String,
      enum: ["INVITED", "SUBSCRIBER", "SUBSCRIBER_PLUS"],
      default: "INVITED",
      index: true,
    },

    isActive: { type: Boolean, default: true, index: true },
    sort: { type: Number, default: 100 },
  },
  { timestamps: true }
);

export type Layer = InferSchemaType<typeof LayerSchema>;
export const LayerModel = mongoose.models.Layer || mongoose.model("Layer", LayerSchema);
