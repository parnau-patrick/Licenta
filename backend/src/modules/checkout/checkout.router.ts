import { Router, Request, Response } from "express";
import { db } from "../../config/db.js";
import { z } from "zod";
import { Prisma } from "@prisma/client";

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
  landingId: z.string().min(1),
  items: z.array(itemSchema).min(1),
  customer: customerSchema,
  subtotal: z.number().nonnegative().optional(),
  shipping: z.number().nonnegative(),
  total: z.number().nonnegative(),
  shippingMethod: z.string().default("Transport RAPID"),
  tracking: z.record(z.string()).optional(),
});

const trackSchema = z.object({
  landingId: z.string().min(1),
  items: z.array(itemSchema).min(1),
  customer: customerSchema.partial(),
  shipping: z.number().nonnegative().optional(),
  total: z.number().nonnegative().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getShopForLanding(landingId: string) {
  const landing = await db.landingPage.findUnique({
    where: { id: landingId },
    include: { shop: true },
  });
  return landing?.shop ?? null;
}

/**
 * Normalizează numărul de telefon românesc la formatul internațional +40...
 */
function toIntlPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("40")) return "+" + digits;
  if (digits.startsWith("0")) return "+4" + digits;
  return "+40" + digits;
}

/**
 * Caută un client Shopify după telefon.
 * Dacă nu există, îl creează.
 * Returnează numeric customer ID (string) sau null.
 */
async function findOrCreateShopifyCustomer(
  customer: z.infer<typeof customerSchema>,
  shop: { myshopifyDomain: string; accessToken: string }
): Promise<string | null> {
  const baseUrl = `https://${shop.myshopifyDomain}/admin/api/2025-01`;
  const token = shop.accessToken;
  const intlPhone = toIntlPhone(customer.phone);
  const rawPhone = customer.phone.replace(/\s/g, "");

  const addressPayload = {
    first_name: customer.firstName,
    last_name: customer.lastName || customer.firstName,
    address1: customer.address,
    city: customer.city,
    province: customer.county,
    country: "Romania",
    country_code: "RO",
    phone: intlPhone,
  };

  async function updateCustomerAddress(customerId: string) {
    try {
      const addrResp = await fetch(
        `${baseUrl}/customers/${customerId}/addresses.json?limit=1`,
        { headers: { "X-Shopify-Access-Token": token } }
      );
      if (!addrResp.ok) return;
      const addrData = await addrResp.json() as any;
      if (addrData.addresses?.length > 0) {
        await fetch(`${baseUrl}/customers/${customerId}/addresses/${addrData.addresses[0].id}.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
          body: JSON.stringify({ address: addressPayload }),
        });
      } else {
        await fetch(`${baseUrl}/customers/${customerId}/addresses.json`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
          body: JSON.stringify({ address: addressPayload }),
        });
      }
    } catch (_) { }
  }

  // Caută după telefon în multiple formate și modalități de query pentru a fi 100% siguri
  const searchQueries: string[] = [
    `phone:"${intlPhone}"`,
    `phone:"${rawPhone}"`,
    `phone:"${intlPhone.replace("+", "")}"`,
    `"${intlPhone}"`,
    `"${rawPhone}"`
  ];

  for (const queryVal of searchQueries) {
    try {
      const r = await fetch(
        `${baseUrl}/customers/search.json?query=${encodeURIComponent(queryVal)}&limit=1`,
        { headers: { "X-Shopify-Access-Token": token } }
      );
      if (r.ok) {
        const d = await r.json() as any;
        if (d.customers && d.customers.length > 0) {
          const found = d.customers[0];
          await updateCustomerAddress(String(found.id));
          return String(found.id);
        }
      }
    } catch (_) { }
  }

  // Creează client nou
  try {
    const createResp = await fetch(`${baseUrl}/customers.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({
        customer: {
          first_name: customer.firstName,
          last_name: customer.lastName || customer.firstName,
          phone: intlPhone,
          addresses: [addressPayload],
          send_email_welcome: false,
        },
      }),
    });
    const createData = await createResp.json() as any;

    if (createResp.ok && createData.customer?.id) {
      return String(createData.customer.id);
    }

    // Telefon deja luat → caută din nou
    if (JSON.stringify(createData.errors || "").includes("already been taken")) {
      const retryResp = await fetch(
        `${baseUrl}/customers/search.json?query=${encodeURIComponent(`phone:"${intlPhone}"`)}&limit=1`,
        { headers: { "X-Shopify-Access-Token": token } }
      );
      if (retryResp.ok) {
        const retryData = await retryResp.json() as any;
        if (retryData.customers?.length > 0) {
          await updateCustomerAddress(String(retryData.customers[0].id));
          return String(retryData.customers[0].id);
        }
      }
    }
  } catch (_) { }

  return null;
}

/**
 * Creează o comandă reală în Shopify (orders.json) cu plată COD.
 * Identic cu logica din IdealClean.
 */
async function createShopifyOrder(
  data: z.infer<typeof orderSchema>,
  shop: { myshopifyDomain: string; accessToken: string }
) {
  const baseUrl = `https://${shop.myshopifyDomain}/admin/api/2025-01`;
  const { customer, items, shipping, total, shippingMethod, tracking } = data;

  const intlPhone = toIntlPhone(customer.phone);
  const firstName = customer.firstName || "Client";
  const lastName = customer.lastName?.trim() || firstName;
  const shippingTitle = Number(shipping) > 0 ? (shippingMethod || "Transport RAPID") : "Transport GRATUIT";

  // Găsim sau creăm clientul
  const customerNumId = await findOrCreateShopifyCustomer(customer, shop);

  const address = {
    first_name: firstName,
    last_name: lastName,
    address1: customer.address,
    city: customer.city,
    province: customer.county,
    country: "Romania",
    country_code: "RO",
    phone: intlPhone,
  };

  // Construim line items și calculăm discount-ul de cantitate
  let totalOriginal = 0;
  let totalQty = 0;

  const lineItems = items.map((item) => {
    const vId = item.shopifyVariantId || item.productShopifyVariantId || null;
    const rawVId = vId && typeof vId === "string" && vId.includes("/")
      ? vId.split("/").pop()
      : vId;
    const numericId = rawVId ? Number(rawVId) : null;
    const label = item.bundleLabel ? ` (${item.bundleLabel})` : "";

    const qty = Number(item.qty || 1);
    totalQty += qty;

    // Prețul per unitate: dacă e bundle cu qty > 1 și avem originalUnitPrice, îl folosim pentru a arăta discountul
    const priceToUse = (qty > 1 && item.originalUnitPrice)
      ? Number(item.originalUnitPrice).toFixed(2)
      : (item.price / qty).toFixed(2);

    totalOriginal += Number(priceToUse) * qty;

    const payload: Record<string, unknown> = {
      quantity: qty,
      price: priceToUse,
    };

    if (numericId) {
      payload.variant_id = numericId;
    } else {
      payload.title = `${item.productName || "Produs"}${label}`;
    }

    if (item.color) {
      payload.properties = [{ name: "Culoare", value: item.color }];
    }

    return payload;
  });

  // Discount calculat DOAR când avem mai mult de o bucată în total
  const calculatedDiscount = (totalQty > 1)
    ? Math.max(0, totalOriginal - (total - Number(shipping))).toFixed(2)
    : "0.00";

  const orderPayload: Record<string, unknown> = {
    phone: intlPhone,
    shipping_address: address,
    billing_address: address,

    customer: customerNumId
      ? { id: parseInt(customerNumId) }
      : { first_name: firstName, last_name: lastName, phone: intlPhone },

    line_items: lineItems,

    shipping_lines: [{
      title: shippingTitle,
      price: Number(shipping).toFixed(2),
      code: "RAPID",
      source: "custom",
    }],

    // Tranzacție COD — pending (plata la livrare)
    transactions: [{
      kind: "sale",
      status: "pending",
      gateway: "cash_on_delivery",
      amount: Number(total).toFixed(2),
    }],

    note_attributes: [
      { name: "Nume și prenume", value: `${firstName} ${lastName}` },
      { name: "Telefon", value: intlPhone },
      { name: "Adresa", value: customer.address || "" },
      { name: "Judet", value: customer.county || "" },
      { name: "Localitate", value: customer.city || "" },
      { name: "country", value: "RO" },
      ...(tracking?.utm_source ? [{ name: "utm_source", value: tracking.utm_source }] : []),
      ...(tracking?.utm_medium ? [{ name: "utm_medium", value: tracking.utm_medium }] : []),
      ...(tracking?.utm_campaign ? [{ name: "utm_campaign", value: tracking.utm_campaign }] : []),
      ...(tracking?.utm_content ? [{ name: "utm_content", value: tracking.utm_content }] : []),
      ...(tracking?.utm_id ? [{ name: "utm_id", value: tracking.utm_id }] : []),
    ],

    currency: "RON",
    financial_status: "pending",
    send_receipt: false,
    send_fulfillment_receipt: false,
    tags: "landing-page,cod,ramburs",
    note: "Comandă prin Landing Page | Plata la livrare (COD)",
  };

  // Adăugăm discount dacă există
  if (Number(calculatedDiscount) > 0.01) {
    orderPayload.discount_codes = [{
      code: "QUANTITY DISCOUNT",
      amount: calculatedDiscount,
      type: "fixed_amount",
    }];
  }

  const response = await fetch(`${baseUrl}/orders.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": shop.accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ order: orderPayload }),
  });

  let responseData = await response.json() as any;
  if (!response.ok) {
    // Dacă eroarea este legată de telefonul deja luat al clientului, trimitem din nou fără obiectul customer inline.
    // Shopify va asocia automat comanda cu clientul existent pe baza câmpului phone de la nivelul de sus.
    const errorStr = JSON.stringify(responseData.errors || responseData);
    if (errorStr.includes("already been taken") || errorStr.includes("phone_number")) {
      console.log("[checkout/order] ⚠️ Phone taken conflict. Retrying order creation without inline customer payload...");
      
      const retryPayload = { ...orderPayload };
      delete retryPayload.customer; // Eliminăm conflictul

      const retryResponse = await fetch(`${baseUrl}/orders.json`, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": shop.accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ order: retryPayload }),
      });

      responseData = await retryResponse.json() as any;
      if (retryResponse.ok) {
        return {
          id: responseData.order?.id,
          name: `#${responseData.order?.order_number}`,
        };
      }
    }

    console.error(
      `[checkout/order] ❌ Eroare Shopify (Status ${response.status}):`,
      JSON.stringify(responseData.errors || responseData, null, 2)
    );
    throw new Error(`Shopify order error: ${response.status}`);
  }

  return {
    id: responseData.order?.id,
    name: `#${responseData.order?.order_number}`,
  };
}

/**
 * Creare Draft Order Shopify — doar pentru checkout abandonat (tracking)
 */
async function createShopifyDraft(
  items: z.infer<typeof itemSchema>[],
  shipping: number,
  customer: Partial<z.infer<typeof customerSchema>>,
  shop: { myshopifyDomain: string; accessToken: string }
) {
  const baseUrl = `https://${shop.myshopifyDomain}/admin/api/2025-01`;

  const lineItems = items.map((item) => {
    const vId = item.shopifyVariantId || item.productShopifyVariantId || null;
    const rawVId = vId && typeof vId === "string" && vId.includes("/")
      ? vId.split("/").pop()
      : vId;
    const numericId = rawVId ? Number(rawVId) : null;
    const label = item.bundleLabel ? ` (${item.bundleLabel})` : "";

    const payload: Record<string, unknown> = {
      quantity: item.qty || 1,
      price: (item.price / (item.qty || 1)).toFixed(2),
    };

    if (numericId) {
      payload.variant_id = numericId;
    } else {
      payload.title = `${item.productName || "Produs"}${label}`;
    }

    if (item.color) {
      payload.properties = [{ name: "Culoare", value: item.color }];
    }

    return payload;
  });

  const draftPayload: Record<string, unknown> = {
    line_items: lineItems,
    shipping_line: {
      title: Number(shipping) > 0 ? "Transport RAPID" : "Transport GRATUIT",
      price: Number(shipping).toFixed(2),
      custom: true,
    },
    tags: "landing-page,abandon,cod",
    send_invoice: false,
  };

  if (customer?.phone) {
    const intlPhone = toIntlPhone(customer.phone);
    const firstName = customer.firstName || "Client";
    const lastName = customer.lastName || firstName;

    const address = {
      first_name: firstName,
      last_name: lastName,
      phone: intlPhone,
      address1: customer.address || "",
      city: customer.city || "",
      province: customer.county || "",
      country: "Romania",
      country_code: "RO",
    };

    draftPayload.shipping_address = address;
    draftPayload.customer = {
      first_name: firstName,
      last_name: lastName,
      phone: intlPhone,
    };
  }

  const resp = await fetch(`${baseUrl}/draft_orders.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": shop.accessToken },
    body: JSON.stringify({ draft_order: draftPayload }),
  });
  const data = await resp.json() as any;
  if (!resp.ok) throw new Error(`Draft create error: ${resp.status} ${JSON.stringify(data.errors)}`);
  return data.draft_order?.id;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/checkout/order — Creare comandă reală Shopify (COD)
checkoutRouter.post("/order", async (req: Request, res: Response) => {
  // Curăță câmpurile goale din customer
  if (req.body?.customer && typeof req.body.customer === "object") {
    for (const key of Object.keys(req.body.customer)) {
      if (req.body.customer[key] === "") delete req.body.customer[key];
    }
  }

  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Date invalide", details: parsed.error.flatten() });
    return;
  }

  // Răspundem instant — clientul vede success imediat
  res.json({ success: true, message: "Comanda a fost plasată cu succes!" });

  // Procesăm comanda în background
  setImmediate(async () => {
    try {
      const shop = await getShopForLanding(parsed.data.landingId);
      if (!shop?.accessToken) {
        console.error("[checkout/order] ❌ Shop sau accessToken lipsă pentru landingId:", parsed.data.landingId);
        return;
      }

      // Marcăm checkout-ul abandonat ca finalizat (dacă există) — ca în IdealClean
      const phone = parsed.data.customer.phone.replace(/\s/g, "");
      try {
        await db.abandonedCheckout.update({
          where: { id: phone },
          data: { status: "ordered" },
        });
      } catch (_) {
        // Nu există abandon înregistrat — OK, ignorăm
      }

      console.log("[checkout/order] 📦 Creare comandă reală Shopify pentru shop:", shop.myshopifyDomain);
      const shopifyOrder = await createShopifyOrder(parsed.data, shop as any);
      console.log("[checkout/order] ✅ Comandă creată cu succes în Shopify:", shopifyOrder.name, "| ID:", shopifyOrder.id);
    } catch (err) {
      console.error("[checkout/order] ❌ Background error:", err);
    }
  });
});

// POST /api/checkout/track — Tracking checkout abandonat
// Salvează datele în DB. Worker-ul de background (abandon-worker.ts) va crea
// draft-ul în Shopify după 5 minute de inactivitate — exact ca în IdealClean.
checkoutRouter.post("/track", async (req: Request, res: Response) => {
  // Curăță câmpurile goale din customer
  if (req.body?.customer && typeof req.body.customer === "object") {
    for (const key of Object.keys(req.body.customer)) {
      if (req.body.customer[key] === "") delete req.body.customer[key];
    }
  }

  const parsed = trackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Date invalide", details: parsed.error.flatten() });
    return;
  }

  const { customer, items, shipping = 20, total = 0, landingId } = parsed.data;
  const phone = (customer.phone || "").replace(/\s/g, "");
  const firstName = (customer.firstName || "").trim();

  // Obligatoriu: telefon + prenume (GDPR: nu stocăm fără date minime)
  if (!phone || !firstName) {
    res.json({ success: false });
    return;
  }

  // Mascare date pentru logs (GDPR)
  const maskedPhone = phone.length > 4
    ? phone.slice(0, 3) + "*".repeat(phone.length - 4) + phone.slice(-1)
    : "***";
  console.log(`[checkout/track] 📝 Abandon tracking: ${maskedPhone}`);

  // Răspundem instant
  res.json({ success: true });

  // Salvăm/actualizăm în DB în background
  setImmediate(async () => {
    try {
      const now = new Date();

      // Upsert: dacă există deja → resetăm la pending + actualizăm datele
      // Dacă nu există → creăm
      await db.abandonedCheckout.upsert({
        where: { id: phone },
        create: {
          id: phone,
          landingId,
          customer: customer as unknown as Prisma.InputJsonValue,
          items: items as unknown as Prisma.InputJsonValue,
          shipping,
          total,
          status: "pending",
          lastActivity: now,
        },
        update: {
          landingId,
          customer: customer as unknown as Prisma.InputJsonValue,
          items: items as unknown as Prisma.InputJsonValue,
          shipping,
          total,
          status: "pending",  // resetăm la pending pentru a reîncepe timerul de 5 min
          shopifyDraftId: null,
          lastActivity: now,
        },
      });
    } catch (err) {
      console.error("[checkout/track] ❌ DB error:", err);
    }
  });
});
