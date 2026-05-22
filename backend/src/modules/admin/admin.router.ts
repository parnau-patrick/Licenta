import { Router, Request, Response } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { db } from "../../config/db.js";
import { z } from "zod";

export const adminRouter = Router();

// Middleware: numai ADMIN
function requireAdmin(req: Request, res: Response, next: any) {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "Acces interzis. Numai administratorii pot accesa aceasta resursă." });
    return;
  }
  next();
}

// GET /api/admin/users — toți utilizatorii
adminRouter.get("/users", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        plan: true,
        emailVerified: true,
        stripeSubscriptionId: true,
        createdAt: true,
        shops: {
          where: { isActive: true },
          select: { myshopifyDomain: true },
          take: 1,
        },
      },
    });
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id/plan — schimbă planul manual
adminRouter.patch("/users/:id/plan", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { plan } = z
      .object({ plan: z.enum(["FREE", "STARTER", "PRO"]) })
      .parse(req.body);

    const user = await db.user.update({
      where: { id: req.params.id },
      data: { plan },
      select: { id: true, email: true, plan: true },
    });

    res.json({ user, message: `Planul a fost actualizat la ${plan}.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id/role — schimbă rolul
adminRouter.patch("/users/:id/role", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { role } = z
      .object({ role: z.enum(["ADMIN", "USER"]) })
      .parse(req.body);

    const user = await db.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, role: true },
    });

    res.json({ user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id — șterge utilizator
adminRouter.delete("/users/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Nu ștergem contul ADMIN
    const target = await db.user.findUnique({ where: { id: req.params.id } });
    if (target?.role === "ADMIN") {
      res.status(403).json({ error: "Nu poți șterge contul ADMIN." });
      return;
    }

    await db.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/admin/stats — statistici platformă
adminRouter.get("/stats", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const [totalUsers, byPlan, totalLandings, totalShops] = await Promise.all([
      db.user.count(),
      db.user.groupBy({ by: ["plan"], _count: { plan: true } }),
      db.landingPage.count(),
      db.shop.count({ where: { isActive: true } }),
    ]);

    const planCounts = { FREE: 0, STARTER: 0, PRO: 0 };
    byPlan.forEach((p) => {
      planCounts[p.plan] = p._count.plan;
    });

    res.json({ totalUsers, planCounts, totalLandings, totalShops });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
