const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export type TemplateItem = {
  id: string;
  name: string;
  sections: string[];
};

export type ImagePattern = {
  id: string;
  name: string;
  style: string;
};

export type ImportedImage = {
  id: string;
  url: string;
};

export type GeneratedVariant = {
  id: string;
  label: string;
  url: string;
};

type JsonResult<T> = Promise<T>;

async function parseJson<T>(response: Response): JsonResult<T> {
  if (!response.ok) {
    const fallbackMessage = `Request failed with status ${response.status}`;
    const raw = await response.text();

    if (!raw) {
      throw new Error(fallbackMessage);
    }

    try {
      const data = JSON.parse(raw) as { error?: string; message?: string };
      throw new Error(data.error ?? data.message ?? fallbackMessage);
    } catch {
      throw new Error(raw || fallbackMessage);
    }
  }

  return (await response.json()) as T;
}

export async function fetchTemplates(): JsonResult<{ items: TemplateItem[] }> {
  const response = await fetch(`${API_BASE_URL}/api/landings/templates`);
  return parseJson<{ items: TemplateItem[] }>(response);
}

export async function fetchImagePatterns(): JsonResult<{ items: ImagePattern[] }> {
  const response = await fetch(`${API_BASE_URL}/api/images/patterns`);
  return parseJson<{ items: ImagePattern[] }>(response);
}

export async function importAlibabaImages(
  alibabaUrl: string
): JsonResult<{ sourceUrl: string; title?: string | null; images: ImportedImage[] }> {
  const response = await fetch(`${API_BASE_URL}/api/images/import-alibaba`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ alibabaUrl })
  });

  return parseJson<{ sourceUrl: string; title?: string | null; images: ImportedImage[] }>(response);
}

export type ConceptInput = {
  id: string;
  label: string;
  prompt: string;
};

export async function generateImageVariants(payload: {
  imageId: string;
  imageUrl: string;
  concepts: ConceptInput[];
}): JsonResult<{ variants: GeneratedVariant[]; cutoutUrl: string }> {
  const response = await fetch(`${API_BASE_URL}/api/images/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return parseJson<{ variants: GeneratedVariant[]; cutoutUrl: string }>(response);
}

export type MarketingCopy = {
  title: string;
  benefits: string[];
  instructions: string[];
  review: { name: string; text: string };
  customFive: string;
  customSix: string;
};

export async function generateMarketingCopy(
  title: string,
  context: string = ""
): JsonResult<MarketingCopy> {
  const response = await fetch(`${API_BASE_URL}/api/images/generate-copy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title, context })
  });

  return parseJson<MarketingCopy>(response);
}
