import mongoose from "mongoose";

const TenantSchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, ref: "User" },
    name: { type: String, required: true },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
  },
  { timestamps: true }
);

TenantSchema.index({ ownerUserId: 1 }, { unique: true });

export const TenantModel = mongoose.model("Tenant", TenantSchema);
export type TenantDoc = mongoose.InferSchemaType<typeof TenantSchema> & { _id: mongoose.Types.ObjectId };
