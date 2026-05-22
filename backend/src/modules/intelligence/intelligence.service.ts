import OpenAI from "openai";
import { env } from "../../config/env.js";
import { scrapeAlibabaProduct } from "../alibaba/alibaba.service.js";

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

export async function generatePriceIntelligence(input: { type: 'url' | 'shopify', url?: string, productData?: any }) {
  if (!openai) {
    throw new Error("OpenAI API key is missing.");
  }

  // 1. Get product data (Scrape or use provided Shopify data)
  let scrapedData;
  if (input.type === 'url' && input.url) {
    scrapedData = await scrapeAlibabaProduct(input.url);
  } else if (input.type === 'shopify' && input.productData) {
    scrapedData = {
      title: input.productData.title,
      price: input.productData.price || "Preț nespecificat",
      images: input.productData.images || [],
      scrapedUrl: "Produs Intern Shopify"
    };
  } else {
    throw new Error("Date invalide pentru analiză.");
  }

  // 2. Build Prompt for OpenAI
  const prompt = `
Ești un expert în Pricing Strategy, eCommerce și Conversion Rate Optimization (CRO).
Te rog să analizezi următorul produs extras de pe internet:

- Titlu: "${scrapedData.title}"
- Preț Extras: "${scrapedData.price}"
- Link: "${scrapedData.scrapedUrl}"

Returnează STRICT UN JSON VALID care să conțină sugestii pentru un proprietar de magazin online Shopify. Structura trebuie să fie exact următoarea:
{
  "marketAnalysis": "O scurtă analiză a acestui tip de produs și a prețului concurenței.",
  "recommendedPrice": "Prețul pe care îl recomanzi pentru piața din România (ex: 149 RON)",
  "recommendedOldPrice": "Prețul tăiat (ex: 299 RON)",
  "pricingStrategy": "De ce recomanzi acest preț (ex: ancorare, preț psihologic, marjă mare)",
  "bundleSuggestions": [
    { "qty": 1, "label": "Pachet Standard", "price": 149, "badge": "Testează" },
    { "qty": 2, "label": "Pachet Cuplu", "price": 249, "badge": "Cel Mai Vândut" },
    { "qty": 3, "label": "Pachet Familial", "price": 299, "badge": "Cea Mai Bună Ofertă" }
  ],
  "promoOffers": [
    "Transport Gratuit la comenzi peste 150 RON",
    "Garanție Retur 30 de Zile"
  ]
}
Returnează doar JSON-ul valid, fără text suplimentar sau Markdown blocks.
`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4o-mini",
    response_format: { type: "json_object" }
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Failed to generate price intelligence from OpenAI");

  const aiData = JSON.parse(content);

  return {
    scrapedData,
    aiData
  };
}
