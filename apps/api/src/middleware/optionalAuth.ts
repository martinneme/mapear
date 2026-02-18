import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthedReq = Request & {
  user?: {
    id: string;
    email: string;
    globalRole: "ANALYST" | "SUBSCRIBER";
    planTier: "INVITED" | "SUBSCRIBER" | "SUBSCRIBER_PLUS";
    tenantId?: string | null;
  };
};

export function optionalAuth(req: AuthedReq, _res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return next();

  const token = h.slice("Bearer ".length);

  try {
    const secret = process.env.JWT_SECRET || "dev_secret";
    const payload: any = jwt.verify(token, secret);

    req.user = {
      id: payload.sub,
      email: payload.email,
      globalRole: payload.globalRole,
      planTier: payload.planTier || "INVITED",
      tenantId: payload.tenantId || null,
    };
  } catch {
    // token inválido → guest
  }

  next();
}
