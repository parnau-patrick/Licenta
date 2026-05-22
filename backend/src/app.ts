import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { healthRouter } from "./modules/health/health.router.js";
import { landingRouter } from "./modules/landing/landing.router.js";
import { imageRouter } from "./modules/images/image.router.js";
import { authRouter } from "./modules/auth/auth.router.js";
import { shopifyRouter } from "./modules/shopify/shopify.router.js";
import { alibabaRouter } from "./modules/alibaba/alibaba.router.js";
import { checkoutRouter } from "./modules/checkout/checkout.router.js";
import { publicRouter } from "./modules/public/public.router.js";
import { stripeRouter } from "./modules/stripe/stripe.router.js";
import { adminRouter } from "./modules/admin/admin.router.js";
import { intelligenceRouter } from "./modules/intelligence/intelligence.router.js";
import { notificationsRouter } from "./modules/notifications/notifications.router.js";
import { db } from "./config/db.js";

export const app = express();

// IMPORTANT: Stripe webhook trebuie raw body ÎNAINTE de express.json()
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

// Allowed origins: localhost + orice URL setat în FRONTEND_ORIGIN (poate fi virgulă-separat)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "http://localhost:4000",
  // Adaugă automat FRONTEND_ORIGIN din env (ex: https://my-app.vercel.app)
  ...env.FRONTEND_ORIGIN.split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean),
];

app.use(
  cors({
    origin: (origin, callback) => {

      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/$/, "");

      if (allowedOrigins.includes(cleanOrigin)) return callback(null, true);

      // Permite orice subdomeniu vercel.app (pentru producție și preview-uri)
      if (cleanOrigin.endsWith(".vercel.app")) return callback(null, true);

      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// ── API Routes ──────────────────────────────────────────
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/shopify", shopifyRouter);
app.use("/api/alibaba", alibabaRouter);
app.use("/api/images", imageRouter);
app.use("/api/landings", landingRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/public", publicRouter);   // Fara autentificare — acces public
app.use("/api/stripe", stripeRouter);   // Stripe payments
app.use("/api/admin", adminRouter);     // Admin panel
app.use("/api/intelligence", intelligenceRouter); // Price intelligence
app.use("/api/notifications", notificationsRouter); // Notifications

// ── embed.js — scriptul injectat in paginile Shopify ───
app.get("/embed.js", async (req, res) => {
  const landingIdQuery = req.query["data-landing-id"] as string | undefined;
  const backendUrl = env.HOST || "http://localhost:4000";
  const frontendUrl = env.FRONTEND_ORIGIN || "http://localhost:5173";

  const script = `
(function() {
  var currentScript = document.currentScript;
  var landingId = '';
  if (currentScript) {
    landingId = currentScript.getAttribute('data-landing-id') || '';
    if (!landingId && currentScript.src) {
      try {
        var urlParams = new URL(currentScript.src).searchParams;
        landingId = urlParams.get('data-landing-id') || urlParams.get('landing-id') || '';
      } catch(err) {}
    }
  }
  if (!landingId) landingId = '${landingIdQuery || ""}';
  landingId = landingId.trim();

  if (!landingId) { console.error('[LandingEmbed] No landing ID'); return; }

  var appBase = '${frontendUrl}';

  // ── Opțiunea 3: iframe fullscreen fixed (acoperă header + footer) ─────────
  // Iframe-ul ocupă TOT ecranul, scroll-ul se face ÎNĂUNTRUL iframe-ului.
  // Header-ul și footer-ul Shopify sunt ascunse în spate (z-index mai mic).
  var iframe = document.createElement('iframe');
  iframe.src = appBase + '/landing-preview/' + landingId;
  iframe.title = 'Landing Page';
  iframe.setAttribute('loading', 'eager');
  // position:fixed + 100vw/100vh = acoperă tot ecranul
  // overflow:auto = scroll intern în iframe
  // z-index:9999 = deasupra oricărui element Shopify
  iframe.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'width: 100vw',
    'height: 100vh',
    'border: none',
    'z-index: 9999',
    'background: white',
    'overflow: auto',
    'display: block'
  ].join(' !important;') + ' !important;';

  document.body.appendChild(iframe);

  // Blocăm scroll-ul paginii Shopify (body) — scroll-ul e doar în iframe
  document.body.style.setProperty('overflow', 'hidden', 'important');
  document.documentElement.style.setProperty('overflow', 'hidden', 'important');
})();
`.trim();

  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send(script);
});
