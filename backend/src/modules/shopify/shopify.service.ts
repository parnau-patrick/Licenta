import { createHmac } from "crypto";
import { db } from "../../config/db.js";
import { env } from "../../config/env.js";

export function buildInstallUrl(shop: string): string {
  const redirectUri = `${env.HOST}/api/shopify/callback`;
  const params = new URLSearchParams({
    client_id: env.SHOPIFY_API_KEY,
    scope: env.SHOPIFY_SCOPES,
    redirect_uri: redirectUri,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

export function verifyHmac(query: Record<string, string>): boolean {
  const { hmac, ...rest } = query;
  if (!hmac) return false;

  const message = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join("&");

  const digest = createHmac("sha256", env.SHOPIFY_API_SECRET)
    .update(message)
    .digest("hex");

  return digest === hmac;
}

export async function exchangeToken(shop: string, code: string): Promise<{ accessToken: string; scope: string }> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.SHOPIFY_API_KEY,
      client_secret: env.SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`Shopify token exchange failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string; scope: string };
  return { accessToken: data.access_token, scope: data.scope };
}

export async function saveShop(userId: string, shop: string, accessToken: string, scope: string) {
  return db.shop.upsert({
    where: { myshopifyDomain: shop },
    update: { accessToken, scope, isActive: true, userId },
    create: { myshopifyDomain: shop, accessToken, scope, userId },
  });
}

export async function fetchShopifyProducts(shop: string, accessToken: string) {
  const response = await fetch(
    `https://${shop}/admin/api/2024-01/products.json?limit=50&fields=id,title,body_html,vendor,product_type,images,variants,status`,
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status}`);
  }

  const data = (await response.json()) as { products: any[] };
  return data.products;
}

export async function fetchShopifySalesMetrics(shop: string, accessToken: string) {
  // Fetch recent orders to calculate sales per product
  const response = await fetch(
    `https://${shop}/admin/api/2024-01/orders.json?status=any&limit=250&fields=line_items`,
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    return {}; // Graceful fallback
  }

  const data = (await response.json()) as { orders: any[] };
  const salesMap: Record<number, number> = {};

  data.orders.forEach((order) => {
    order.line_items?.forEach((item: any) => {
      if (item.product_id) {
        salesMap[item.product_id] = (salesMap[item.product_id] || 0) + (item.quantity || 1);
      }
    });
  });

  return salesMap;
}

export async function getShopByUser(userId: string) {
  return db.shop.findFirst({ where: { userId, isActive: true } });
}

export async function fetchShopifyRawOrders(shop: string, accessToken: string) {
  const response = await fetch(
    `https://${shop}/admin/api/2024-01/orders.json?status=any&limit=250&fields=id,name,created_at,total_price,currency,financial_status,customer,line_items`,
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.status}`);
  }

  const data = (await response.json()) as { orders: any[] };
  return data.orders;
}

export async function fetchShopifyDraftOrders(shop: string, accessToken: string) {
  const response = await fetch(
    `https://${shop}/admin/api/2024-01/draft_orders.json?limit=250&fields=id,name,created_at,total_price,status,customer,line_items,tags`,
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch draft orders: ${response.status}`);
  }

  const data = (await response.json()) as { draft_orders: any[] };
  return data.draft_orders;
}
