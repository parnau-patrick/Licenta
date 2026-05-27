import { Router, Request, Response } from "express";
import { z } from "zod";
import fetch from "node-fetch";
import { AlibabaImportError, importAlibabaProduct } from "./alibaba-import.service.js";
import { generateImageVariants, ImageGenerationError } from "./image-generation.service.js";
import { generateMarketingCopy } from "./copy-generation.service.js";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { requirePlan } from "../../middlewares/requirePlan.js";
import { getShopByUser } from "../shopify/shopify.service.js";
import { db } from "../../config/db.js";

const importAlibabaSchema = z.object({
  alibabaUrl: z.string().url()
});

const conceptSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  prompt: z.string().max(5000)
});

const generateSchema = z.object({
  imageId: z.string().min(1),
  imageUrl: z.string().url(),
  concepts: z.array(conceptSchema).min(1).max(6)
});

const generateCopySchema = z.object({
  title: z.string().min(1),
  context: z.string().default("")
});

const saveImageSchema = z.object({
  url: z.string().min(1),
  filename: z.string().min(1),
  label: z.string().optional(),
  sourceType: z.enum(["generated", "uploaded"]).default("generated"),
});

const uploadImageSchema = z.object({
  filename: z.string().min(1),
  label: z.string().optional(),
  dataUrl: z.string().min(1), // base64 data URL
});

export const imageRouter = Router();

// POST /api/images/import-alibaba (STARTER+)
imageRouter.post("/import-alibaba", requireAuth, requirePlan("STARTER"), async (req, res) => {
  const parsed = importAlibabaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid Alibaba URL" });

  try {
    const imported = await importAlibabaProduct(parsed.data.alibabaUrl);
    return res.json(imported);
  } catch (error) {
    if (error instanceof AlibabaImportError) return res.status(400).json({ error: error.message });
    return res.status(500).json({ error: "Could not import Alibaba product images" });
  }
});

// POST /api/images/generate (STARTER+)
imageRouter.post("/generate", requireAuth, requirePlan("STARTER"), async (req, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid generation payload", details: parsed.error.flatten() });

  try {
    const result = await generateImageVariants({
      imageUrl: parsed.data.imageUrl,
      concepts: parsed.data.concepts
    });

    return res.json({
      sourceImageId: parsed.data.imageId,
      variants: result.variants,
      cutoutUrl: result.cutoutUrl
    });
  } catch (error) {
    if (error instanceof ImageGenerationError) return res.status(400).json({ error: error.message });
    return res.status(500).json({ error: "Failed to generate AI image variants" });
  }
});

// POST /api/images/generate-copy (STARTER+)
imageRouter.post("/generate-copy", requireAuth, requirePlan("STARTER"), async (req, res) => {
  const parsed = generateCopySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid copy generation payload" });

  try {
    const copyData = await generateMarketingCopy(parsed.data.title, parsed.data.context);
    return res.json(copyData);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to generate copy" });
  }
});

/* ═══════════════════════════════════════════
   IMAGE LIBRARY endpoints
═══════════════════════════════════════════ */

// GET /api/images/library — lista imaginilor salvate
imageRouter.get("/library", requireAuth, async (req: Request, res: Response) => {
  const shop = await getShopByUser(req.user!.userId);
  if (!shop) { res.status(404).json({ error: "No shop connected." }); return; }

  const images = await db.savedImage.findMany({
    where: { shopId: shop.id },
    orderBy: { createdAt: "desc" },
  });

  res.json({ images });
});

// POST /api/images/library/save — salveaza imagine generata (dupa URL extern)
imageRouter.post("/library/save", requireAuth, async (req: Request, res: Response) => {
  const parsed = saveImageSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Date invalide", details: parsed.error.flatten() }); return; }

  const shop = await getShopByUser(req.user!.userId);
  if (!shop) { res.status(404).json({ error: "No shop connected." }); return; }

  const image = await db.savedImage.create({
    data: {
      shopId: shop.id,
      url: parsed.data.url,
      filename: parsed.data.filename,
      label: parsed.data.label,
      sourceType: parsed.data.sourceType,
    },
  });

  res.status(201).json({ image });
});

// POST /api/images/library/upload — upload imagine (base64 data URL)
imageRouter.post("/library/upload", requireAuth, async (req: Request, res: Response) => {
  const parsed = uploadImageSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Date invalide", details: parsed.error.flatten() }); return; }

  const shop = await getShopByUser(req.user!.userId);
  if (!shop) { res.status(404).json({ error: "No shop connected." }); return; }

  // Salvăm data URL-ul direct — pentru producție ar trebui uploadat pe S3/Cloudinary
  const image = await db.savedImage.create({
    data: {
      shopId: shop.id,
      url: parsed.data.dataUrl,
      filename: parsed.data.filename,
      label: parsed.data.label,
      sourceType: "uploaded",
    },
  });

  res.status(201).json({ image });
});

// DELETE /api/images/library/:id — sterge din librarie
imageRouter.delete("/library/:id", requireAuth, async (req: Request, res: Response) => {
  const shop = await getShopByUser(req.user!.userId);
  if (!shop) { res.status(404).json({ error: "No shop connected." }); return; }

  const existing = await db.savedImage.findFirst({
    where: { id: req.params.id, shopId: shop.id },
  });

  if (!existing) { res.status(404).json({ error: "Image not found." }); return; }

  await db.savedImage.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// GET /api/images/library/:id/download — redirect la URL pentru download
imageRouter.get("/library/:id/download", requireAuth, async (req: Request, res: Response) => {
  const shop = await getShopByUser(req.user!.userId);
  if (!shop) { res.status(404).json({ error: "No shop connected." }); return; }

  const image = await db.savedImage.findFirst({
    where: { id: req.params.id, shopId: shop.id },
  });

  if (!image) { res.status(404).json({ error: "Image not found." }); return; }

  // Dacă e data URL (uploaded), returnăm direct
  if (image.url.startsWith("data:")) {
    const [header, data] = image.url.split(",");
    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const buffer = Buffer.from(data, "base64");
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="${image.filename}"`);
    res.send(buffer);
    return;
  }

  // Altfel, redirect la URL-ul extern
  res.redirect(image.url);
});

// GET /api/images/proxy — proxy pentru imagini externe (evită problemele de CORS și canvas-tainting în editor)
imageRouter.get("/proxy", async (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) {
    res.status(400).json({ error: "URL param is required" });
    return;
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      res.status(response.status).json({ error: "Failed to fetch remote image" });
      return;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: "Error proxying image" });
  }
});

