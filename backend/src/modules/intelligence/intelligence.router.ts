import { Router, Request, Response } from "express";
import { generatePriceIntelligence } from "./intelligence.service.js";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { requirePlan } from "../../middlewares/requirePlan.js";

export const intelligenceRouter = Router();

// Price Intelligence necesită plan PRO
intelligenceRouter.use(requireAuth, requirePlan("PRO"));

intelligenceRouter.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { url, type = "url", productData } = req.body;
    
    if (type === "url" && !url) {
      res.status(400).json({ error: "URL is required" });
      return;
    }

    const result = await generatePriceIntelligence({ type, url, productData });
    res.json(result);
  } catch (error: any) {
    console.error("Intelligence Analysis Error:", error);
    res.status(500).json({ error: error.message || "Eroare la analizarea URL-ului." });
  }
});
