import mongoose from "mongoose";

export const PLAN_TIERS = ["INVITED", "SUBSCRIBER", "SUBSCRIBER_PLUS"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },

    // Define "qué sos" en el sistema
    globalRole: { type: String, enum: ["ANALYST", "SUBSCRIBER"], required: true },

    // Define "qué plan tenés" (los 3 niveles que pediste)
    planTier: {
      type: String,
      enum: PLAN_TIERS,
      default: "INVITED",
      index: true,
    },

    // opcional: vencimiento del plan (útil para pagos)
    planUntil: { type: Date },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model("User", UserSchema);

export type UserDoc = mongoose.InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};