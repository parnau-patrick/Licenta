import { load } from "cheerio";

type ImportedImage = {
  id: string;
  url: string;
};

export type AlibabaImportResult = {
  sourceUrl: string;
  title: string | null;
  images: ImportedImage[];
};

const MAX_IMAGES = 12;
const REQUEST_TIMEOUT_MS = 12_000;

export class AlibabaImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlibabaImportError";
  }
}

function isAllowedAlibabaHost(hostname: string): boolean {
  return hostname === "alibaba.com" || hostname.endsWith(".alibaba.com");
}

function toAbsoluteUrl(rawUrl: string, baseUrl: string): string | null {
  const candidate = rawUrl.trim();

  if (!candidate || candidate.startsWith("data:") || candidate.startsWith("javascript:")) {
    return null;
  }

  const normalized = candidate.startsWith("//") ? `https:${candidate}` : candidate;

  try {
    const absolute = new URL(normalized, baseUrl);
    if (absolute.protocol !== "http:" && absolute.protocol !== "https:") {
      return null;
    }

    return absolute.toString();
  } catch {
    return null;
  }
}

function parseSrcSet(srcSet: string, baseUrl: string): string[] {
  return srcSet
    .split(",")
    .map((item) => item.trim().split(" ")[0])
    .map((value) => toAbsoluteUrl(value, baseUrl))
    .filter((value): value is string => Boolean(value));
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function extractImageUrls(html: string, sourceUrl: string): string[] {
  const $ = load(html);

  const metaCandidates = [
    'meta[property="og:image"]',
    'meta[name="og:image"]',
    'meta[property="og:image:url"]',
    'meta[name="twitter:image"]'
  ];

  const metaImages = metaCandidates
    .map((selector) => $(selector).attr("content") ?? "")
    .map((value) => toAbsoluteUrl(value, sourceUrl))
    .filter((value): value is string => Boolean(value));

  const domImages = $("img")
    .map((_index, element) => {
      const direct =
        $(element).attr("src") ??
        $(element).attr("data-src") ??
        $(element).attr("data-lazy-src") ??
        $(element).attr("data-ks-lazyload") ??
        "";

      return toAbsoluteUrl(direct, sourceUrl);
    })
    .get()
    .filter((value): value is string => Boolean(value));

  const srcSetImages = $("img[srcset],source[srcset]")
    .map((_index, element) => parseSrcSet($(element).attr("srcset") ?? "", sourceUrl))
    .get()
    .flat();

  const all = unique([...metaImages, ...domImages, ...srcSetImages]);

  return all
    .filter((url) => {
      const lowered = url.toLowerCase();
      return !lowered.endsWith(".svg") && (lowered.includes(".jpg") || lowered.includes(".jpeg") || lowered.includes(".png") || lowered.includes(".webp") || lowered.includes("image"));
    })
    .slice(0, MAX_IMAGES);
}

function extractTitle(html: string): string | null {
  const $ = load(html);
  const title =
    $("meta[property='og:title']").attr("content") ??
    $("meta[name='title']").attr("content") ??
    $("title").text();

  const normalized = title?.trim();
  return normalized ? normalized : null;
}

export async function importAlibabaProduct(alibabaUrl: string): Promise<AlibabaImportResult> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(alibabaUrl);
  } catch {
    throw new AlibabaImportError("Invalid Alibaba URL format.");
  }

  if (!isAllowedAlibabaHost(parsedUrl.hostname)) {
    throw new AlibabaImportError("Only alibaba.com product links are allowed.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml"
      }
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AlibabaImportError("Alibaba request timed out. Try again.");
    }

    throw new AlibabaImportError("Could not fetch Alibaba product page.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new AlibabaImportError(`Alibaba request failed with status ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new AlibabaImportError("Alibaba page did not return HTML content.");
  }

  const html = await response.text();
  const images = extractImageUrls(html, parsedUrl.toString());

  if (images.length === 0) {
    throw new AlibabaImportError("No product images found on this Alibaba page.");
  }

  return {
    sourceUrl: parsedUrl.toString(),
    title: extractTitle(html),
    images: images.map((url, index) => ({
      id: `img-${index + 1}`,
      url
    }))
  };
}
