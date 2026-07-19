import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: number;
      role: string;
      organizationId: number | null;
    };
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = (req.session as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  // Populate req.user for downstream org scoping (C10)
  if (!(req as any).user) {
    db.select({ id: usersTable.id, role: usersTable.role, organizationId: usersTable.organizationId })
      .from(usersTable).where(eq(usersTable.id, userId))
      .then(([u]) => {
        if (u) req.user = u;
        next();
      })
      .catch(() => next());
    return;
  }
  next();
}

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req.session as any).userId;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const [user] = await db.select({ id: usersTable.id, role: usersTable.role, organizationId: usersTable.organizationId })
      .from(usersTable).where(eq(usersTable.id, userId));
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    req.user = user;
    next();
  };
}
