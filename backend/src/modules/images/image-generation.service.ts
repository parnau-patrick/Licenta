import { env } from "../../config/env.js";
import FormData from "form-data";
import fetch from "node-fetch";
import sharp from "sharp";

export type ConceptInput = {
  id: string;
  label: string;
  prompt: string;
};

export type GenerateImageInput = {
  imageUrl: string;
  concepts: ConceptInput[];
};

export type GeneratedVariant = {
  id: string;
  label: string;
  url: string;
};

export class ImageGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageGenerationError";
  }
}

async function downloadSourceImage(imageUrl: string): Promise<Buffer> {
  let sourceBuffer: Buffer;

  if (imageUrl.startsWith("data:")) {
    const base64 = imageUrl.split(",")[1];
    sourceBuffer = Buffer.from(base64, "base64");
  } else {
    const res = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!res.ok) {
      throw new ImageGenerationError(`Nu am putut descărca imaginea sursă (${res.status}).`);
    }

    sourceBuffer = Buffer.from(await res.arrayBuffer());
  }

  return await sharp(sourceBuffer)
    .resize(1024, 1024, { fit: "cover" })
    .png()
    .toBuffer();
}

async function removeBackground(imageBuffer: Buffer): Promise<string> {
  if (!env.STABILITY_API_KEY) {
    throw new ImageGenerationError("STABILITY_API_KEY lipsește pentru decupajul imaginii!");
  }

  const formData = new FormData();
  formData.append("image", imageBuffer, { filename: "product.png", contentType: "image/png" });
  formData.append("output_format", "png");

  const response = await fetch("https://api.stability.ai/v2beta/stable-image/edit/remove-background", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STABILITY_API_KEY}`,
      Accept: "application/json",
      ...formData.getHeaders()
    },
    body: formData
  }) as any;

  const raw = await response.text();
  if (!response.ok) {
    throw new ImageGenerationError(`Stability Remove BG Error (${response.status}): ${raw.slice(0, 400)}`);
  }

  const payload = JSON.parse(raw);
  if (!payload.image) throw new ImageGenerationError("No image field returned from Stability AI.");
  return payload.image;
}

async function pollNanaBananaTask(taskId: string, maxWaitMs = 120_000): Promise<string> {
  const start = Date.now();
  const pollUrl = `https://api.nanobananaapi.ai/api/v1/nanobanana/record-info?taskId=${taskId}`;

  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 4000));

    const res = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${env.NANOBANANA_API_KEY}` }
    }) as any;

    if (!res.ok) continue;

    const data = (await res.json()) as any;
    const flag = data?.successFlag ?? data?.data?.successFlag;

    if (flag === 1) {
      const url = data?.response?.resultImageUrl ?? data?.data?.response?.resultImageUrl;
      if (!url) throw new ImageGenerationError("NanoBanana: task reușit dar URL lipsă.");
      return url as string;
    }

    if (flag === 2 || flag === 3) {
      throw new ImageGenerationError(`NanaBanana: generare eșuată (flag=${flag}).`);
    }
    // flag === 0 = încă se generează
  }

  throw new ImageGenerationError("NanaBanana: timeout după 120s.");
}

async function generateWithNanoBanana(concept: ConceptInput, sourceImageUrl: string): Promise<GeneratedVariant> {
  if (!env.NANOBANANA_API_KEY) {
    throw new ImageGenerationError("NANOBANANA_API_KEY lipsește!");
  }

  const res = await fetch("https://api.nanobananaapi.ai/api/v1/nanobanana/generate-2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.NANOBANANA_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt: concept.prompt,
      imageUrls: [sourceImageUrl],
      aspectRatio: "1:1",
      resolution: "1K",
      googleSearch: false,
      outputFormat: "jpg"
    })
  }) as any;

  if (!res.ok) {
    const raw = await res.text();
    throw new ImageGenerationError(`NanoBanana request eșuat (${res.status}): ${raw.slice(0, 300)}`);
  }

  const data = (await res.json()) as any;
  const taskId = data?.data?.taskId;
  if (!taskId) throw new ImageGenerationError("NanoBanana: nu a returnat taskId.");

  const imageUrl = await pollNanaBananaTask(taskId);

  return { id: concept.id, label: concept.label, url: imageUrl };
}

export async function generateImageVariants(
  input: GenerateImageInput
): Promise<{ variants: GeneratedVariant[]; cutoutUrl: string }> {
  // 1. Descarcă și procesează imaginea produsului
  const imageBuffer = await downloadSourceImage(input.imageUrl);

  // 2. Elimină fundalul cu Stability AI
  const cutoutBase64 = await removeBackground(imageBuffer);
  const cutoutUrl = `data:image/png;base64,${cutoutBase64}`;

  // 3. Generează fundalurile cu NanoBanana 2 (image-to-image pe baza imaginii de la Alibaba)
  const variants: GeneratedVariant[] = [];
  for (const concept of input.concepts) {
    if (!concept.prompt.trim()) continue; // Sărim conceptele fără prompt
    variants.push(await generateWithNanoBanana(concept, input.imageUrl));
  }

  return { variants, cutoutUrl };
}
