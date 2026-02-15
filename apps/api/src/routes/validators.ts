import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  globalRole: z.enum(["ANALYST", "SUBSCRIBER"]),
  tenantName: z.string().min(2).optional(), // only for analysts (auto-tenant)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const accessRequestSchema = z.object({});

export const updateGrantSchema = z.object({
  allowedLayerIds: z.union([z.literal("ALL"), z.array(z.string())]).optional(),
  canSuggestContent: z.boolean().optional(),
  canSuggestRelations: z.boolean().optional(),
});
