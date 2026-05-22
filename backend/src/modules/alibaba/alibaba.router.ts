import { Router, Request, Response } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { scrapeAlibabaProduct } from "./alibaba.service.js";

export const alibabaRouter = Router();

alibabaRouter.post("/scrape", requireAuth, async (req: Request, res: Response) => {
  const { url } = req.body;

  if (!url || !url.startsWith("http")) {
    res.status(400).json({ error: "Te rog introdu un URL valid Alibaba/Aliexpress." });
    return;
  }

  try {
    const data = await scrapeAlibabaProduct(url);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
