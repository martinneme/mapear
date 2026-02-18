import type { Response, NextFunction } from "express";
import { optionalAuth, AuthedReq } from "./optionalAuth.js";

export function requireAuth(req: AuthedReq, res: Response, next: NextFunction) {
  // Primero intentamos poblar req.user si hay token
  optionalAuth(req, res as any, () => {
    if (!req.user) return res.status(401).json({ error: "UNAUTHORIZED" });
    next();
  });
}
