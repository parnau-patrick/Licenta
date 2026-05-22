import { Router, Request, Response } from "express";
import { db } from "../../config/db.js";
import { requireAuth } from "../../middlewares/requireAuth.js";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const notifications = await db.notification.findMany({
      where: { userId: (req as any).user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

notificationsRouter.put("/:id/read", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.notification.update({
      where: { id, userId: (req as any).user.id },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update notification" });
  }
});
