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
  if (!landingId) {
    landingId = '${landingIdQuery || ""}';
  }
  landingId = landingId.trim();

  var rootId = currentScript
    ? currentScript.getAttribute('data-root-id')
    : 'lp-root-' + landingId;

  if (!landingId) { console.error('[LandingEmbed] No landing ID provided'); return; }

  var apiBase = '${backendUrl}';
  var appBase = '${frontendUrl}';

  var root = document.getElementById(rootId);
  if (!root) { console.error('[LandingEmbed] Root element not found: ' + rootId); return; }

  // Injectăm stilul pentru a sparge marginile temei Shopify și a ascunde titlul paginii implicite
  var style = document.createElement('style');
  style.innerHTML = ' \
    .main-page-title, .page-title, h1.page-title, .section-header, .page-header, .shopify-section-main-page .title, .shopify-section-main-page h1, .rte h1, .page-width h1, #MainContent h1 { \
      display: none !important; \
    } \
    #' + rootId + ' { \
      width: 100vw !important; \
      height: auto !important; \
      min-height: 100vh !important; \
      position: relative !important; \
      left: 50% !important; \
      right: 50% !important; \
      margin-left: -50vw !important; \
      margin-right: -50vw !important; \
      padding: 0 !important; \
      margin-top: 0 !important; \
      margin-bottom: 0 !important; \
      box-sizing: border-box !important; \
    } \
    html, body { \
      overflow-x: hidden !important; \
    } \
  ';
  document.head.appendChild(style);

  // Ascundem titlurile implicite din Shopify în mod dinamic prin scanare DOM (pentru a fi 100% independenți de temă)
  try {
    var hideSelectors = [
      'h1', 
      '.main-page-title', 
      '.page-title', 
      '.title', 
      '.section-header', 
      '.page-header',
      '.shopify-section-main-page h1',
      '.rte h1'
    ];

    var isInsideHeaderOrFooter = function(el) {
      if (typeof el.closest === 'function') {
        return el.closest('header') || el.closest('footer') || el.closest('#shopify-section-header') || el.closest('#shopify-section-footer') || el.closest('.header') || el.closest('.footer');
      }
      var node = el;
      while (node && node !== document.body) {
        var tag = node.tagName ? node.tagName.toLowerCase() : '';
        var id = node.id ? node.id.toLowerCase() : '';
        var cls = node.className ? String(node.className).toLowerCase() : '';
        if (tag === 'header' || tag === 'footer' || id.indexOf('header') !== -1 || id.indexOf('footer') !== -1 || cls.indexOf('header') !== -1 || cls.indexOf('footer') !== -1) {
          return true;
        }
        node = node.parentNode;
      }
      return false;
    };

    for (var i = 0; i < hideSelectors.length; i++) {
      var elements = document.querySelectorAll(hideSelectors[i]);
      for (var j = 0; j < elements.length; j++) {
        var el = elements[j];
        if (!root.contains(el)) {
          if (!isInsideHeaderOrFooter(el)) {
            el.style.setProperty('display', 'none', 'important');
          }
        }
      }
    }
  } catch (err) {
    console.warn('[LandingEmbed] Error hiding page titles:', err);
  }

  var iframe = document.createElement('iframe');
  iframe.src = appBase + '/landing-preview/' + landingId;
  iframe.style.cssText = 'width: 100% !important; border: none !important; min-height: 100vh !important; display: block !important; overflow: hidden !important;';
  iframe.title = 'Landing Page';
  iframe.setAttribute('loading', 'eager');
  iframe.setAttribute('scrolling', 'no');

  root.appendChild(iframe);

  // Ascultăm mesajele postMessage de tip landing-height pentru a redimensionare cross-origin
  window.addEventListener('message', function(e) {
    var data = e.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch(err) {}
    }
    
    if (data && data.type === 'landing-height') {
      var msgId = data.landingId ? String(data.landingId).trim().toLowerCase() : '';
      var localId = landingId ? String(landingId).trim().toLowerCase() : '';
      
      // Dacă IDs se potrivesc sau dacă localId nu e definit, redimensionăm iframe-ul
      if (!localId || msgId === localId) {
        var newHeight = parseInt(data.height, 10);
        if (newHeight > 0) {
          iframe.style.setProperty('height', newHeight + 'px', 'important');
          iframe.style.setProperty('min-height', newHeight + 'px', 'important');
        }
      }
    }
  });
})();
`.trim();

  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send(script);
});
