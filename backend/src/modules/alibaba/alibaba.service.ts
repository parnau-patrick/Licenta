import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

export interface ScrapedData {
  title: string;
  price: string;
  images: string[];
  scrapedUrl: string;
}

export async function scrapeAlibabaProduct(url: string): Promise<ScrapedData> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36");
    
    // Increase timeout and wait for domcontentloaded instead of networkidle to avoid hanging on Alibaba
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    
    const content = await page.content();
    const $ = cheerio.load(content);

    // Extract Title
    const title = $("h1").first().text().trim() || $("title").text().trim();
    
    // Extract Price (Generic selectors for e-commerce)
    let price = $(".price, .product-price, [data-role='price']").first().text().trim();
    if (!price) {
      // Find elements containing '$'
      price = $("*:contains('$')").filter((_, el) => $(el).children().length === 0).first().text().trim();
    }
    
    // Extract Images
    const images: string[] = [];
    $("img").each((_, el) => {
      let src = $(el).attr("src") || $(el).attr("data-src") || "";
      // Filter out tracking pixels / tiny icons
      if (src && (src.includes(".jpg") || src.includes(".png") || src.includes(".jpeg"))) {
        // Clean up Alibaba specific lazy load URLs
        src = src.replace(/_.webp$/g, "").replace(/_200x200\.jpg$/g, "");
        if (src.startsWith("//")) images.push(`https:${src}`);
        else if (src.startsWith("http")) images.push(src);
      }
    });

    // Keep unique images
    const uniqueImages = [...new Set(images)].slice(0, 8);

    return {
      title,
      price: price || "Price not found",
      images: uniqueImages,
      scrapedUrl: url
    };
  } catch (error) {
    console.error("Scraping error:", error);
    throw new Error("Nu am putut prelua datele de pe Alibaba. Verifică URL-ul sau încearcă mai târziu.");
  } finally {
    await browser.close();
  }
}
