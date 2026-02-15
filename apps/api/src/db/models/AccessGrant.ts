import mongoose from "mongoose";

const AccessGrantSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, ref: "Tenant" },
    subscriberUserId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, ref: "User" },
    status: { type: String, enum: ["PENDING", "ACTIVE", "REVOKED"], default: "PENDING" },
    allowedLayerIds: { type: mongoose.Schema.Types.Mixed, default: "ALL" }, // "ALL" or ObjectId[]
    canSuggestContent: { type: Boolean, default: false },
    canSuggestRelations: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AccessGrantSchema.index({ tenantId: 1, subscriberUserId: 1 }, { unique: true });

export const AccessGrantModel = mongoose.model("AccessGrant", AccessGrantSchema);
export type AccessGrantDoc = mongoose.InferSchemaType<typeof AccessGrantSchema> & { _id: mongoose.Types.ObjectId };
