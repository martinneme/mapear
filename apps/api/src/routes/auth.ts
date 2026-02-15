import { Router } from "express";
import bcrypt from "bcrypt";
import { UserModel } from "../db/models/User.js";
import { TenantModel } from "../db/models/Tenant.js";
import { loginSchema, registerSchema } from "./validators.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password, globalRole, tenantName } = parsed.data;

  const exists = await UserModel.findOne({ email }).lean();
  if (exists) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({ email, passwordHash, globalRole });

  // if analyst: create tenant automatically
  let tenant = null as any;
  if (globalRole === "ANALYST") {
    tenant = await TenantModel.create({
      ownerUserId: user._id,
      name: tenantName || `${email.split("@")[0]} (tenant)`,
      status: "active",
    });
  }

  return res.json({
    user: { id: String(user._id), email: user.email, globalRole: user.globalRole },
    tenant: tenant ? { id: String(tenant._id), name: tenant.name } : null,
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const user = await UserModel.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const accessToken = signAccessToken({ sub: String(user._id), role: user.globalRole });
  const refreshToken = signRefreshToken({ sub: String(user._id), role: user.globalRole });

  return res.json({
    accessToken,
    refreshToken,
    user: { id: String(user._id), email: user.email, globalRole: user.globalRole },
  });
});

authRouter.post("/refresh", async (req, res) => {
  const refreshToken = req.body?.refreshToken;
  if (!refreshToken) return res.status(400).json({ error: "Missing refreshToken" });

  try {
    const payload = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken({ sub: payload.sub, role: payload.role });
    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});
