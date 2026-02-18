// src/models/subscription.model.ts
import mongoose from "mongoose";

export const SUBSCRIPTION_STATUSES = ["PENDING", "ACTIVE", "REJECTED", "CANCELED"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

const SubscriptionSchema = new mongoose.Schema(
  {
    // El "canal/espacio" suscribible (Tenant del analista)
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    // El usuario que se suscribe (puede ser SUBSCRIBER o ANALYST)
    subscriberUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: "PENDING",
      index: true,
    },

    // Auditoría básica
    decidedAt: { type: Date, default: null },
    canceledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/**
 * Un usuario no puede tener 2 relaciones distintas para el mismo tenant.
 * Esto evita duplicados (pendiente/activa/etc).
 */
SubscriptionSchema.index({ tenantId: 1, subscriberUserId: 1 }, { unique: true });

/**
 * Índices útiles para consultas frecuentes:
 * - "mis suscripciones" (por subscriber + status)
 * - "requests del owner" (por tenant + status)
 */
SubscriptionSchema.index({ subscriberUserId: 1, status: 1, updatedAt: -1 });
SubscriptionSchema.index({ tenantId: 1, status: 1, updatedAt: -1 });

// ✅ Evita OverwriteModelError en dev/HMR
export const SubscriptionModel =
  (mongoose.models.Subscription as mongoose.Model<any>) ||
  mongoose.model("Subscription", SubscriptionSchema);

export type SubscriptionDoc = mongoose.InferSchemaType<typeof SubscriptionSchema> & {
  _id: mongoose.Types.ObjectId;
};
