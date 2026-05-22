import { Router, Request, Response } from "express";
import { db } from "../../config/db.js";

export const publicRouter = Router();

// GET /api/public/landing/:id — config pentru embed (fara autentificare)
publicRouter.get("/landing/:id", async (req: Request, res: Response) => {
  const landing = await db.landingPage.findUnique({
    where: { id: req.params.id },
    include: { shop: { select: { myshopifyDomain: true } } },
  });

  if (!landing || !landing.isPublished) {
    res.status(404).json({ error: "Landing page not found or not published." });
    return;
  }

  res.json({
    id: landing.id,
    shopDomain: landing.shop.myshopifyDomain,
    productTitle: landing.productTitle,
    shopifyProductId: landing.shopifyProductId,
    config: landing.config,
  });
});
