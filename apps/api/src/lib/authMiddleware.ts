import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "./jwt.js";

export type AuthedRequest = Request & { user?: { id: string; role: "ANALYST" | "SUBSCRIBER" } };

export function authRequired(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing Bearer token" });
  const token = header.slice("Bearer ".length);
  try {
    const p = verifyAccessToken(token);
    req.user = { id: p.sub, role: p.role };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
