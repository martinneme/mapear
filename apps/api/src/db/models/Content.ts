import mongoose, { Schema, InferSchemaType } from "mongoose";

const ContentSchema = new Schema(
  {
    iso3: { type: String, required: true, index: true }, // "ARG"
    layerKey: { type: String, required: true, index: true }, // "conflicts_2026"

    // Analista (tenant) y autor
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    authorUserId: { type: Schema.Types.ObjectId, required: true, index: true },

    title: { type: String, required: true },
    summary: { type: String, default: "" },
    body: { type: String, default: "" },

    // pay/free por item (además del tier por capa)
    visibility: { type: String, enum: ["FREE", "PAID"], default: "FREE", index: true },

    tags: { type: [String], default: [] },
    publishedAt: { type: Date, default: Date.now, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ContentSchema.index({ iso3: 1, layerKey: 1, publishedAt: -1 });

export type Content = InferSchemaType<typeof ContentSchema>;
export const ContentModel = mongoose.models.Content || mongoose.model("Content", ContentSchema);
