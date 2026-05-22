import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),

  // AI / Image generation
  SEGMIND_API_KEY: z.string().optional(),
  SEGMIND_IMG2IMG_URL: z.string().default("https://api.segmind.com/v1/sd1.5-img2img"),
  SEGMIND_STEPS: z.coerce.number().default(20),
  SEGMIND_CFG_SCALE: z.coerce.number().default(7.5),
  SEGMIND_DENOISE: z.coerce.number().default(0.6),
  SEGMIND_WIDTH: z.coerce.number().default(512),
  SEGMIND_HEIGHT: z.coerce.number().default(512),
  STABILITY_API_KEY: z.string().optional(),
  NANOBANANA_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Database
  DATABASE_URL: z.string(),

  // Auth
  JWT_SECRET: z.string().default("super-secret-jwt-key-change-me-later"),

  // Shopify
  SHOPIFY_API_KEY: z.string(),
  SHOPIFY_API_SECRET: z.string(),
  SHOPIFY_SCOPES: z.string().default("read_products,read_orders,write_orders,read_inventory,write_content,read_content"),
  HOST: z.string().default("http://localhost:4000"),

  // SMTP Email
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().default("AI Studio <noreply@aistudio.ro>"),

  // Stripe
  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),
  STRIPE_PRICE_ID_STARTER: z.string().default(""),
  STRIPE_PRICE_ID_PRO: z.string().default(""),
});

export const env = schema.parse(process.env);
