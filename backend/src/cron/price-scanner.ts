import cron from "node-cron";
import { db } from "../config/db.js";
import { generatePriceIntelligence } from "../modules/intelligence/intelligence.service.js";
import fetch from "node-fetch";

// Funcție pentru a extrage produsele de la Shopify (la fel ca in shopify.service, dar fara acces la cookie/sesiune)
async function getShopProducts(shopDomain: string, accessToken: string) {
  const url = `https://${shopDomain}/admin/api/2024-01/products.json?limit=5`; // LIMITA LA 5 pentru costuri
  const response = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": accessToken,
    },
  });
  if (!response.ok) return [];
  const data = await response.json() as any;
  return data.products || [];
}

export function initCronJobs() {
  // Ruleaza in fiecare zi la ora 03:00 AM: "0 3 * * *"
  // Pentru teste rapide, vom lasa la ora 03:00 dar oferim functia de scanare manuala
  cron.schedule("0 3 * * *", async () => {
    console.log("[CRON] Starting Daily Price Intelligence Scanner...");
    await runPriceIntelligenceScan();
  });
}

export async function runPriceIntelligenceScan() {
  try {
    const activeShops = await db.shop.findMany({
      where: { isActive: true },
      include: { user: true }
    });

    for (const shop of activeShops) {
      if (!shop.accessToken) continue;

      const products = await getShopProducts(shop.myshopifyDomain, shop.accessToken);
      
      // Limităm analiza la primele 3 produse ca măsură de siguranță pentru costurile OpenAI
      const productsToAnalyze = products.slice(0, 3);

      for (const prod of productsToAnalyze) {
        try {
          console.log(`[CRON] Analyzing product: ${prod.title} for user: ${shop.userId}`);
          
          const productData = {
            title: prod.title,
            price: prod.variants?.[0]?.price || "",
            images: prod.images?.map((i: any) => i.src) || []
          };

          const aiResult = await generatePriceIntelligence({ type: "shopify", productData });

          // Verificăm dacă AI-ul sugerează un preț diferit sau o promoție importantă
          // Simplificat: vom genera o notificare de fiecare dată când găsește sugestii valide,
          // dar ideal aici ar trebui o verificare de profitabilitate sau schimbare majoră.
          if (aiResult && aiResult.aiData && aiResult.aiData.recommendedPrice) {
            
            // Verificam daca am mai creat azi o notificare pentru acest produs
            const startOfDay = new Date();
            startOfDay.setHours(0,0,0,0);
            
            const existing = await db.notification.findFirst({
              where: {
                userId: shop.userId,
                title: { contains: prod.title },
                createdAt: { gte: startOfDay }
              }
            });

            if (!existing) {
              await db.notification.create({
                data: {
                  userId: shop.userId,
                  title: `Oportunitate Preț: ${prod.title}`,
                  message: `AI-ul nostru sugerează un preț de ${aiResult.aiData.recommendedPrice} pentru a maximiza conversiile. ${aiResult.aiData.pricingStrategy}`,
                  link: `/price-intelligence?productId=${prod.id}`
                }
              });
            }
          }
        } catch (err: any) {
          console.error(`[CRON] Error analyzing product ${prod.title}:`, err.message);
        }
      }
    }
    console.log("[CRON] Daily Price Intelligence Scanner finished.");
  } catch (error) {
    console.error("[CRON] Fatal error in Price Scanner:", error);
  }
}
