import mongoose, { Schema, InferSchemaType } from "mongoose";

const GeoSchema = new Schema(
  {
    type: { type: String, enum: ["Point", "LineString"], required: true },
    coordinates: { type: Schema.Types.Mixed, required: true }, // [lng,lat] | [[lng,lat],...]
  },
  { _id: false }
);

const MapEventSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true }, // analista
    authorUserId: { type: Schema.Types.ObjectId, required: true, index: true },

    layerKey: { type: String, required: true, index: true }, // ej: "conflicts_2026"
    kind: { type: String, enum: ["POINT", "LINE"], required: true, index: true },

    iso3: { type: String, default: "", index: true }, // opcional (ARG, USA)
    title: { type: String, required: true },
    summary: { type: String, default: "" },

    visibility: { type: String, enum: ["FREE", "PAID"], default: "FREE", index: true },

    geometry: { type: GeoSchema, required: true },

    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

MapEventSchema.index({ layerKey: 1, iso3: 1, kind: 1 });
MapEventSchema.index({ tenantId: 1, createdAt: -1 });

export type MapEvent = InferSchemaType<typeof MapEventSchema>;
export const MapEventModel =
  mongoose.models.MapEvent || mongoose.model("MapEvent", MapEventSchema);
