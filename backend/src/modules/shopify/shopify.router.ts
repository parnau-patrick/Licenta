import { Router, Request, Response } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import {
  buildInstallUrl,
  verifyHmac,
  exchangeToken,
  saveShop,
  fetchShopifyProducts,
  fetchShopifySalesMetrics,
  getShopByUser,
} from "./shopify.service.js";
import { env } from "../../config/env.js";
import { db } from "../../config/db.js";

export const shopifyRouter = Router();

// GET /api/shopify/install?shop=mystore.myshopify.com
shopifyRouter.get("/install", (req: Request, res: Response) => {
  const shop = req.query.shop as string;

  if (!shop || !shop.endsWith(".myshopify.com")) {
    res.status(400).json({ error: "Invalid shop domain. Must end with .myshopify.com" });
    return;
  }

  const installUrl = buildInstallUrl(shop);
  res.redirect(installUrl);
});

// GET /api/shopify/callback
shopifyRouter.get("/callback", requireAuth, async (req: Request, res: Response) => {
  const query = req.query as Record<string, string>;
  const { shop, code } = query;

  if (!shop || !code) {
    res.status(400).json({ error: "Missing shop or code parameter." });
    return;
  }

  if (!verifyHmac(query)) {
    res.status(401).json({ error: "HMAC validation failed." });
    return;
  }

  try {
    const { accessToken, scope } = await exchangeToken(shop, code);
    await saveShop(req.user!.userId, shop, accessToken, scope);
    res.redirect(`${env.FRONTEND_ORIGIN}/products?connected=true`);
  } catch (err: any) {
    res.redirect(`${env.FRONTEND_ORIGIN}/connect-shopify?error=${encodeURIComponent(err.message)}`);
  }
});

// GET /api/shopify/products (protected)
shopifyRouter.get("/products", requireAuth, async (req: Request, res: Response) => {
  try {
    const shopRecord = await getShopByUser(req.user!.userId);

    if (!shopRecord || !shopRecord.accessToken) {
      res.status(404).json({ error: "No Shopify store connected." });
      return;
    }

    const [products, salesMap] = await Promise.all([
      fetchShopifyProducts(shopRecord.myshopifyDomain, shopRecord.accessToken),
      fetchShopifySalesMetrics(shopRecord.myshopifyDomain, shopRecord.accessToken)
    ]);

    // Attach sales data to products
    const enrichedProducts = products.map(p => ({
      ...p,
      sales: salesMap[p.id] || 0
    }));

    res.json({ shop: shopRecord.myshopifyDomain, products: enrichedProducts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/shopify/status (protected) - check if shop is connected
shopifyRouter.get("/status", requireAuth, async (req: Request, res: Response) => {
  const shopRecord = await getShopByUser(req.user!.userId);
  res.json({
    connected: !!shopRecord?.accessToken,
    shop: shopRecord?.myshopifyDomain ?? null,
  });
});

// GET /api/shopify/orders (protected)
shopifyRouter.get("/orders", requireAuth, async (req: Request, res: Response) => {
  try {
    const shopRecord = await getShopByUser(req.user!.userId);

    if (!shopRecord || !shopRecord.accessToken) {
      res.status(404).json({ error: "No Shopify store connected." });
      return;
    }

    const { fetchShopifyRawOrders } = await import("./shopify.service.js");
    const orders = await fetchShopifyRawOrders(shopRecord.myshopifyDomain, shopRecord.accessToken);
    res.json({ shop: shopRecord.myshopifyDomain, orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/shopify/drafts (protected) - preia Draft Orders (comenzile de pe landing)
shopifyRouter.get("/drafts", requireAuth, async (req: Request, res: Response) => {
  try {
    const shopRecord = await getShopByUser(req.user!.userId);

    if (!shopRecord || !shopRecord.accessToken) {
      res.status(404).json({ error: "No Shopify store connected." });
      return;
    }

    const { fetchShopifyDraftOrders } = await import("./shopify.service.js");
    const draftOrders = await fetchShopifyDraftOrders(shopRecord.myshopifyDomain, shopRecord.accessToken);
    res.json({ shop: shopRecord.myshopifyDomain, drafts: draftOrders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/shopify/disconnect — dezactivează shop-ul curent
shopifyRouter.delete("/disconnect", requireAuth, async (req: Request, res: Response) => {
  try {
    const shopRecord = await getShopByUser(req.user!.userId);
    if (!shopRecord) {
      res.status(404).json({ error: "Niciun magazin conectat." });
      return;
    }
    await db.shop.update({
      where: { id: shopRecord.id },
      data: { isActive: false, accessToken: null },
    });
    res.json({ success: true, message: "Magazinul Shopify a fost deconectat." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
