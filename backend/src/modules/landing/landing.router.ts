import { Router, Request, Response } from "express";
import { db } from "../../config/db.js";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { requirePlan } from "../../middlewares/requirePlan.js";
import { getShopByUser } from "../shopify/shopify.service.js";
import { z } from "zod";
import { generateLandingCopy } from "./landing-ai.service.js";

export const landingRouter = Router();

const createSchema = z.object({
  shopifyProductId: z.string().min(1),
  productTitle: z.string().min(1),
  handle: z.string().min(1),
  config: z.record(z.unknown()).default({}),
});

const updateSchema = z.object({
  config: z.record(z.unknown()),
  productTitle: z.string().optional(),
  handle: z.string().optional(),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// GET /api/landings — lista landing pages ale shop-ului curent
landingRouter.get("/", requireAuth, async (req: Request, res: Response) => {
  const shop = await getShopByUser(req.user!.userId);
  if (!shop) {
    res.status(404).json({ error: "No Shopify store connected." });
    return;
  }

  const pages = await db.landingPage.findMany({
    where: { shopId: shop.id },
    orderBy: { updatedAt: "desc" },
  });

  res.json({ pages });
});

// POST /api/landings/generate-copy — generare text AI (STARTER+)
landingRouter.post("/generate-copy", requireAuth, requirePlan("STARTER"), async (req: Request, res: Response) => {
  const { productTitle, description } = req.body;
  if (!productTitle) {
    res.status(400).json({ error: "Lipseste titlul produsului." });
    return;
  }
  
  try {
    const copy = await generateLandingCopy(productTitle, description || "");
    res.json({ copy });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/landings/:id — config complet
landingRouter.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const shop = await getShopByUser(req.user!.userId);
  if (!shop) {
    res.status(404).json({ error: "No Shopify store connected." });
    return;
  }

  const page = await db.landingPage.findFirst({
    where: { id: req.params.id, shopId: shop.id },
  });

  if (!page) {
    res.status(404).json({ error: "Landing page not found." });
    return;
  }

  res.json({ page });
});

// POST /api/landings — creare noua (STARTER+)
landingRouter.post("/", requireAuth, requirePlan("STARTER"), async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Date invalide", details: parsed.error.flatten() });
    return;
  }

  const shop = await getShopByUser(req.user!.userId);
  if (!shop) {
    res.status(404).json({ error: "No Shopify store connected." });
    return;
  }

  const handle = slugify(parsed.data.handle || parsed.data.productTitle);

  const page = await db.landingPage.create({
    data: {
      shopId: shop.id,
      shopifyProductId: parsed.data.shopifyProductId,
      productTitle: parsed.data.productTitle,
      handle,
      config: parsed.data.config as any,
    },
  });

  res.status(201).json({ page });
});

// PUT /api/landings/:id — auto-save config
landingRouter.put("/:id", requireAuth, async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Date invalide", details: parsed.error.flatten() });
    return;
  }

  const shop = await getShopByUser(req.user!.userId);
  if (!shop) {
    res.status(404).json({ error: "No Shopify store connected." });
    return;
  }

  const existing = await db.landingPage.findFirst({
    where: { id: req.params.id, shopId: shop.id },
  });

  if (!existing) {
    res.status(404).json({ error: "Landing page not found." });
    return;
  }

  const updated = await db.landingPage.update({
    where: { id: req.params.id },
    data: {
      config: parsed.data.config as any,
      ...(parsed.data.productTitle && { productTitle: parsed.data.productTitle }),
      ...(parsed.data.handle && { handle: slugify(parsed.data.handle) }),
    },
  });

  res.json({ page: updated });
});

// POST /api/landings/:id/publish — publică pe Shopify (STARTER+)
landingRouter.post("/:id/publish", requireAuth, requirePlan("STARTER"), async (req: Request, res: Response) => {
  const shop = await getShopByUser(req.user!.userId);
  if (!shop || !shop.accessToken) {
    res.status(404).json({ error: "No Shopify store connected or no access token." });
    return;
  }

  const landing = await db.landingPage.findFirst({
    where: { id: req.params.id, shopId: shop.id },
  });

  if (!landing) {
    res.status(404).json({ error: "Landing page not found." });
    return;
  }

  const backendUrl = process.env.HOST || "http://localhost:4000";
  const embedHtml = `
<div id="lp-root-${landing.id}" style="min-height:100vh;"></div>
<script>
(function(){
  var d=document,s=d.createElement('script');
  s.src='${backendUrl}/embed.js';
  s.setAttribute('data-landing-id','${landing.id}');
  s.setAttribute('data-root-id','lp-root-${landing.id}');
  s.async=true;
  d.head.appendChild(s);
})();
</script>`.trim();

  try {
    type FetchResp = { ok: boolean; text(): Promise<string>; json(): Promise<any> };
    let shopifyResponse: FetchResp;
    const pagePayload = {
      page: {
        title: landing.productTitle,
        handle: landing.handle,
        body_html: embedHtml,
        published: true,
      },
    };

    if (landing.shopifyPageId) {
      // Actualizăm pagina existentă
      shopifyResponse = await fetch(
        `https://${shop.myshopifyDomain}/admin/api/2024-01/pages/${landing.shopifyPageId}.json`,
        {
          method: "PUT",
          headers: {
            "X-Shopify-Access-Token": shop.accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(pagePayload),
        }
      ) as unknown as FetchResp;
    } else {
      // Creăm pagina nouă
      shopifyResponse = await fetch(
        `https://${shop.myshopifyDomain}/admin/api/2024-01/pages.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": shop.accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(pagePayload),
        }
      ) as unknown as FetchResp;
    }

    if (!shopifyResponse.ok) {
      const errText = await shopifyResponse.text();
      res.status(502).json({ error: `Shopify API error: ${errText.slice(0, 200)}` });
      return;
    }

    const shopifyData = (await shopifyResponse.json()) as { page: { id: number; handle: string } };
    const shopifyPage = shopifyData.page;

    // Construim URL-ul public — folosim domeniul custom dacă există
    const shopDomain = shop.myshopifyDomain.replace(".myshopify.com", "");
    const publishedUrl = `https://${shop.myshopifyDomain}/pages/${shopifyPage.handle}`;

    const updated = await db.landingPage.update({
      where: { id: landing.id },
      data: {
        isPublished: true,
        shopifyPageId: String(shopifyPage.id),
        handle: shopifyPage.handle,
        publishedUrl,
      },
    });

    res.json({ page: updated, publishedUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/landings/:id/unpublish — retrage de pe Shopify (published: false)
landingRouter.post("/:id/unpublish", requireAuth, async (req: Request, res: Response) => {
  const shop = await getShopByUser(req.user!.userId);
  if (!shop || !shop.accessToken) {
    res.status(404).json({ error: "No Shopify store connected or no access token." });
    return;
  }

  const landing = await db.landingPage.findFirst({
    where: { id: req.params.id, shopId: shop.id },
  });

  if (!landing || !landing.shopifyPageId) {
    res.status(404).json({ error: "Landing page not found or not published." });
    return;
  }

  try {
    const pagePayload = {
      page: {
        id: parseInt(landing.shopifyPageId, 10),
        published: false,
      },
    };

    const fetchResp = await fetch(
      `https://${shop.myshopifyDomain}/admin/api/2024-01/pages/${landing.shopifyPageId}.json`,
      {
        method: "PUT",
        headers: {
          "X-Shopify-Access-Token": shop.accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pagePayload),
      }
    ) as any;

    if (!fetchResp.ok) {
      const errText = await fetchResp.text();
      res.status(502).json({ error: `Shopify API error: ${errText.slice(0, 200)}` });
      return;
    }

    const updated = await db.landingPage.update({
      where: { id: landing.id },
      data: {
        isPublished: false,
        publishedUrl: null,
      },
    });

    res.json({ page: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/landings/:id — stergere
landingRouter.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const shop = await getShopByUser(req.user!.userId);
  if (!shop) {
    res.status(404).json({ error: "No Shopify store connected." });
    return;
  }

  const existing = await db.landingPage.findFirst({
    where: { id: req.params.id, shopId: shop.id },
  });

  if (!existing) {
    res.status(404).json({ error: "Landing page not found." });
    return;
  }

  // Stergem pagina din Shopify dacă există
  if (existing.shopifyPageId && shop.accessToken) {
    try {
      await fetch(
        `https://${shop.myshopifyDomain}/admin/api/2024-01/pages/${existing.shopifyPageId}.json`,
        {
          method: "DELETE",
          headers: { "X-Shopify-Access-Token": shop.accessToken },
        }
      );
    } catch {
      // Ignoram erorile Shopify la stergere
    }
  }

  await db.landingPage.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});
