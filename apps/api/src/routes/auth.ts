import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { UserModel } from "../db/models/User.js";
import { TenantModel } from "../db/models/Tenant.js";

const router = express.Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  globalRole: z.enum(["ANALYST", "SUBSCRIBER"]),
  tenantName: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type PlanTier = "INVITED" | "SUBSCRIBER" | "SUBSCRIBER_PLUS";

function signTokens(user: any, tenantId?: string | null) {
  const secret = process.env.JWT_SECRET || "dev_secret";

  const accessToken = jwt.sign(
    {
      sub: String(user._id),
      email: user.email,
      globalRole: user.globalRole,
      planTier: (user.planTier || "INVITED") as PlanTier,
      tenantId: tenantId || null,
    },
    secret,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign({ sub: String(user._id) }, secret, { expiresIn: "30d" });

  return { accessToken, refreshToken };
}

router.post("/register", async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password, globalRole, tenantName } = parsed.data;

  const exists = await UserModel.findOne({ email }).lean();
  if (exists) return res.status(409).json({ error: "EMAIL_EXISTS" });

  const passwordHash = await bcrypt.hash(password, 10);

  const planTier: PlanTier = globalRole === "SUBSCRIBER" ? "INVITED" : "INVITED";

  const user = await UserModel.create({
    email,
    passwordHash,
    globalRole,
    planTier,
  });

  let tenantId: string | null = null;

  if (globalRole === "ANALYST") {
    const tenant = await TenantModel.create({
      name: tenantName || email.split("@")[0],
      ownerUserId: user._id,
    });
    tenantId = String(tenant._id);
  }

  const tokens = signTokens(user, tenantId);

  return res.json({
    ...tokens,
    user: {
      id: String(user._id),
      email: user.email,
      globalRole: user.globalRole,
      planTier: (user.planTier || "INVITED") as PlanTier,
      tenantId,
    },
  });
});

router.post("/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;

  const user = await UserModel.findOne({ email });
  if (!user) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

  let tenantId: string | null = null;

  if (user.globalRole === "ANALYST") {
    const tenant =
      (await TenantModel.findOne({ ownerUserId: user._id }).lean()) ||
      (await TenantModel.create({
        name: email.split("@")[0],
        ownerUserId: user._id,
      }));

    tenantId = String((tenant as any)._id);
  }

  const tokens = signTokens(user, tenantId);

  return res.json({
    ...tokens,
    user: {
      id: String(user._id),
      email: user.email,
      globalRole: user.globalRole,
      planTier: (user.planTier || "INVITED") as PlanTier,
      tenantId,
    },
  });
});

export default router;
