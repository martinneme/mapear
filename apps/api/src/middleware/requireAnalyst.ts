import { Response, NextFunction } from "express";
import { AuthedReq } from "./optionalAuth.js";

export function requireAnalyst(req: AuthedReq, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }

  if (req.user.globalRole !== "ANALYST") {
    return res.status(403).json({ error: "FORBIDDEN_ANALYST_ONLY" });
  }

  if (!req.user.tenantId) {
    return res.status(400).json({ error: "ANALYST_WITHOUT_TENANT" });
  }

  next();
}
