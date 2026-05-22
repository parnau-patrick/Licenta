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
      // Permite cereri fără origin (ex: Postman, server-to-server)
      if (!origin) return callback(null, true);
      
      const cleanOrigin = origin.replace(/\/$/, "");
      
      // Permite localhost/127.0.0.1 și orice origin definit în allowedOrigins (fără slash final)
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
  const landingId = req.query["data-landing-id"] as string | undefined;
  const backendUrl = env.HOST || "http://localhost:4000";
  const frontendUrl = env.FRONTEND_ORIGIN || "http://localhost:5173";

  const script = `
(function() {
  var landingId = document.currentScript
    ? document.currentScript.getAttribute('data-landing-id')
    : '${landingId || ""}';
  var rootId = document.currentScript
    ? document.currentScript.getAttribute('data-root-id')
    : 'lp-root-' + landingId;

  if (!landingId) { console.error('[LandingEmbed] No landing ID provided'); return; }

  var apiBase = '${backendUrl}';
  var appBase = '${frontendUrl}';

  var root = document.getElementById(rootId);
  if (!root) { console.error('[LandingEmbed] Root element not found: ' + rootId); return; }

  var iframe = document.createElement('iframe');
  iframe.src = appBase + '/landing-preview/' + landingId;
  iframe.style.cssText = 'width:100%;border:none;min-height:100vh;display:block;';
  iframe.title = 'Landing Page';
  iframe.setAttribute('loading', 'eager');
  iframe.setAttribute('scrolling', 'yes');

  iframe.onload = function() {
    try {
      var h = iframe.contentWindow.document.body.scrollHeight;
      if (h > 0) iframe.style.height = h + 'px';
    } catch(e) {}
  };

  root.appendChild(iframe);

  window.addEventListener('resize', function() {
    try {
      var h = iframe.contentWindow.document.body.scrollHeight;
      if (h > 0) iframe.style.height = h + 'px';
    } catch(e) {}
  });
})();
`.trim();

  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send(script);
});
