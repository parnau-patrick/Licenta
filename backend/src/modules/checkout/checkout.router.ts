import { Router, Request, Response } from "express";
import { db } from "../../config/db.js";
import { z } from "zod";

export const checkoutRouter = Router();

const customerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().default(""),
  phone: z.string().min(8),
  address: z.string().min(1),
  city: z.string().min(1),
  county: z.string().min(1),
});

const itemSchema = z.object({
  productId: z.string().optional(),
  productName: z.string().min(1),
  bundleLabel: z.string().default("1x buc"),
  color: z.string().nullable().optional(),
  qty: z.number().int().min(1),
  price: z.number().nonnegative(),
  originalUnitPrice: z.number().nonnegative().optional(),
  subtotal: z.number().nonnegative().optional(),
  shopifyVariantId: z.union([z.string(), z.number()]).nullable().optional(),
  productShopifyVariantId: z.union([z.string(), z.number()]).nullable().optional(),
});

const orderSchema = z.object({
  landingId: z.string().min(1),  // ID-ul landing page-ului (pentru a afla shop-ul)
  items: z.array(itemSchema).min(1),
  customer: customerSchema,
  subtotal: z.number().nonnegative().optional(), // Făcut opțional pentru compatibilitate
  shipping: z.number().nonnegative(),
  total: z.number().nonnegative(),
  shippingMethod: z.string().default("Transport RAPID"),
});

const trackSchema = z.object({
  landingId: z.string().min(1),
  items: z.array(itemSchema).min(1),
  customer: customerSchema.partial(),
  shipping: z.number().nonnegative().optional(),
  total: z.number().nonnegative().optional(),
});

async function getShopForLanding(landingId: string) {
  const landing = await db.landingPage.findUnique({
    where: { id: landingId },
    include: { shop: true },
  });
  return landing?.shop ?? null;
}

function buildShopifyDraftOrderPayload(data: z.infer<typeof orderSchema>) {
  const { items, customer, shipping, shippingMethod } = data;

  const lineItems = items.map((item) => {
    const variantId = item.shopifyVariantId ?? item.productShopifyVariantId;
    const baseEntry: Record<string, unknown> = {
      quantity: item.qty,
      price: (item.price / item.qty).toFixed(2),
    };
    if (variantId) {
      baseEntry.variant_id = Number(variantId);
    } else {
      baseEntry.title = item.productName;
    }
    return baseEntry;
  });

  const lastName = customer.lastName?.trim() || "-";

  return {
    draft_order: {
      line_items: lineItems,
      customer: {
        first_name: customer.firstName,
        last_name: lastName,
        phone: customer.phone,
      },
      billing_address: {
        first_name: customer.firstName,
        last_name: lastName,
        phone: customer.phone,
        address1: customer.address,
        city: customer.city,
        province: customer.county,
        country: "RO",
      },
      shipping_address: {
        first_name: customer.firstName,
        last_name: lastName,
        phone: customer.phone,
        address1: customer.address,
        city: customer.city,
        province: customer.county,
        country: "RO",
      },
      shipping_line: {
        title: shippingMethod || "Transport RAPID",
        price: shipping.toFixed(2),
        code: "RAPID",
      },
      payment_gateway: "Cash on Delivery (COD)",
      note: `Comandă prin Landing Page | Plata la livrare`,
      tags: "landing-page,cod,ramburs",
      status: "open",
    },
  };
}

// POST /api/checkout/order — Creare Draft Order Shopify (COD)
checkoutRouter.post("/order", async (req: Request, res: Response) => {
  if (req.body && req.body.customer && typeof req.body.customer === "object") {
    for (const key of Object.keys(req.body.customer)) {
      if (req.body.customer[key] === "") {
        delete req.body.customer[key];
      }
    }
  }

  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Date invalide", details: parsed.error.flatten() });
    return;
  }

  // Răspund instant cu success (fire & forget)
  res.json({ success: true, message: "Comanda a fost plasată cu succes!" });

  // Procesăm în background
  try {
    const shop = await getShopForLanding(parsed.data.landingId);
    if (!shop?.accessToken) {
      console.error("[checkout/order] Nu s-a găsit shop-ul sau accessToken lipsă pentru landingId:", parsed.data.landingId);
      return;
    }

    const payload = buildShopifyDraftOrderPayload(parsed.data);

    console.log("[checkout/order] Se trimite payload-ul către Shopify pentru shop:", shop.myshopifyDomain);
    const response = await fetch(`https://${shop.myshopifyDomain}/admin/api/2025-01/draft_orders.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": shop.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    if (!response.ok) {
      console.error(`[checkout/order] Eșec la crearea Draft Order în Shopify (Status ${response.status}):`, responseText);
    } else {
      console.log("[checkout/order] Draft Order creat cu succes în Shopify:", responseText);
    }
  } catch (err) {
    console.error("[checkout/order] Background error:", err);
  }
});

// POST /api/checkout/track — Tracking abandon (beacon)
checkoutRouter.post("/track", async (req: Request, res: Response) => {
  if (req.body && req.body.customer && typeof req.body.customer === "object") {
    for (const key of Object.keys(req.body.customer)) {
      if (req.body.customer[key] === "") {
        delete req.body.customer[key];
      }
    }
  }

  const parsed = trackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Date invalide", details: parsed.error.flatten() });
    return;
  }

  // Răspund instant
  res.json({ success: true });

  // Procesăm în background — creare draft order parțial
  try {
    const shop = await getShopForLanding(parsed.data.landingId);
    if (!shop?.accessToken) {
      console.error("[checkout/track] Nu s-a găsit shop-ul sau accessToken lipsă pentru landingId:", parsed.data.landingId);
      return;
    }

    const { items, customer, shipping = 20, total = 0 } = parsed.data;

    const lineItems = items.map((item) => {
      const variantId = item.shopifyVariantId ?? item.productShopifyVariantId;
      const baseEntry: Record<string, unknown> = {
        quantity: item.qty,
        price: (item.price / item.qty).toFixed(2),
      };
      if (variantId) {
        baseEntry.variant_id = Number(variantId);
      } else {
        baseEntry.title = item.productName;
      }
      return baseEntry;
    });

    const payload = {
      draft_order: {
        line_items: lineItems,
        customer: customer.phone
          ? {
            first_name: customer.firstName || "Client",
            last_name: customer.lastName || "-",
            phone: customer.phone,
          }
          : undefined,
        note: "Abandon tracking — client a completat parțial formularul",
        tags: "landing-page,abandon,cod",
        status: "open",
      },
    };

    console.log("[checkout/track] Se trimite payload-ul de track către Shopify pentru shop:", shop.myshopifyDomain);
    const response = await fetch(`https://${shop.myshopifyDomain}/admin/api/2025-01/draft_orders.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": shop.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    if (!response.ok) {
      console.error(`[checkout/track] Eșec la crearea Draft Order de abandon în Shopify (Status ${response.status}):`, responseText);
    } else {
      console.log("[checkout/track] Draft Order de abandon creat cu succes în Shopify:", responseText);
    }
  } catch (err) {
    console.error("[checkout/track] Background error:", err);
  }
});
