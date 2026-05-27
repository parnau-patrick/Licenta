import { db } from "../config/db.js";

/**
 * Normalizează numărul de telefon la format internațional +40...
 */
function toIntlPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("40")) return "+" + digits;
  if (digits.startsWith("0")) return "+4" + digits;
  return "+40" + digits;
}

/**
 * Creează un Draft Order Shopify pentru un checkout abandonat.
 * Folosit NUMAI de worker-ul de background — nu de utilizator direct.
 */
async function createAbandonDraft(
  items: any[],
  shipping: number,
  customer: any,
  shop: { myshopifyDomain: string; accessToken: string }
): Promise<string | null> {
  const baseUrl = `https://${shop.myshopifyDomain}/admin/api/2025-01`;

  const lineItems = items.map((item: any) => {
    const vId = item.shopifyVariantId || item.productShopifyVariantId || null;
    const rawVId =
      vId && typeof vId === "string" && vId.includes("/")
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

  // Adăugăm datele clientului dacă există
  if (customer?.phone) {
    const intlPhone = toIntlPhone(customer.phone);
    const firstName = customer.firstName || "Client";
    const lastName = customer.lastName || firstName;

    draftPayload.shipping_address = {
      first_name: firstName,
      last_name: lastName,
      phone: intlPhone,
      address1: customer.address || "",
      city: customer.city || "",
      province: customer.county || "",
      country: "Romania",
      country_code: "RO",
    };
    draftPayload.customer = {
      first_name: firstName,
      last_name: lastName,
      phone: intlPhone,
    };
  }

  try {
    const resp = await fetch(`${baseUrl}/draft_orders.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": shop.accessToken,
      },
      body: JSON.stringify({ draft_order: draftPayload }),
    });
    const data = (await resp.json()) as any;
    if (!resp.ok) {
      console.error(
        `[ABANDON-WORKER] ❌ Draft create error (${resp.status}):`,
        JSON.stringify(data.errors)
      );
      return null;
    }
    return data.draft_order?.id ? String(data.draft_order.id) : null;
  } catch (err) {
    console.error("[ABANDON-WORKER] ❌ Fetch error:", err);
    return null;
  }
}

/**
 * Worker principal — rulează la fiecare 60 de secunde.
 * Preia checkout-urile abandonate cu status "pending" și lastActivity > 5 minute.
 * Le sincronizează ca Draft Orders în Shopify.
 */
async function runAbandonWorker() {
  try {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Preluăm max 5 intrări pending mai vechi de 5 minute
    const candidates = await db.abandonedCheckout.findMany({
      where: {
        status: "pending",
        lastActivity: { lt: fiveMinsAgo },
      },
      take: 5,
    });

    if (candidates.length === 0) return;

    console.log(
      `[ABANDON-WORKER] 🔍 ${candidates.length} checkout(uri) abandonate de sincronizat...`
    );

    for (const checkout of candidates) {
      try {
        const customer = checkout.customer as any;
        const items = checkout.items as any[];

        // Ignorăm dacă nu avem prenume (date incomplete)
        if (!customer?.firstName?.trim()) {
          await db.abandonedCheckout.update({
            where: { id: checkout.id },
            data: { status: "synced" }, // marchăm ca procesat pentru a nu mai fi reluat
          });
          continue;
        }

        // Obținem shop-ul asociat landing page-ului
        const landing = await db.landingPage.findUnique({
          where: { id: checkout.landingId },
          include: { shop: true },
        });

        if (!landing?.shop?.accessToken) {
          console.warn(
            `[ABANDON-WORKER] ⚠️ Shop lipsă sau fără token pentru landingId: ${checkout.landingId}`
          );
          continue;
        }

        const shop = landing.shop;

        // Creăm Draft Order în Shopify
        const draftId = await createAbandonDraft(
          items,
          checkout.shipping,
          customer,
          shop as any
        );

        if (draftId) {
          await db.abandonedCheckout.update({
            where: { id: checkout.id },
            data: { shopifyDraftId: draftId, status: "synced" },
          });
          console.log(
            `[ABANDON-WORKER] ✅ Draft creat pentru ${customer.phone} → Shopify Draft ID: ${draftId}`
          );
        } else {
          // Dacă draft-ul a eșuat, marcăm ca synced oricum pentru a evita retry loop
          await db.abandonedCheckout.update({
            where: { id: checkout.id },
            data: { status: "synced" },
          });
        }
      } catch (err: any) {
        console.error(
          `[ABANDON-WORKER] ❌ Eroare pentru ${checkout.id}:`,
          err.message
        );
      }
    }
  } catch (err: any) {
    console.error("[ABANDON-WORKER] ❌ Eroare generală:", err.message);
  }
}

/**
 * Inițializează worker-ul de abandon tracking.
 * Rulează la fiecare 60 de secunde (ca în IdealClean).
 */
export function initAbandonWorker() {
  console.log("[ABANDON-WORKER] 🚀 Worker pornit — verificare la 60s");
  setInterval(runAbandonWorker, 60 * 1000);
  // Rulare imediată la startup (după 5s pentru a permite DB-ului să se inițializeze)
  setTimeout(runAbandonWorker, 5000);
}
