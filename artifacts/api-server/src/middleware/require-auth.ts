import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = (req.session as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}
