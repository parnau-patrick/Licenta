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

  var rootId = currentScript ? currentScript.getAttribute('data-root-id') : 'lp-root-' + landingId;
  if (!landingId) { console.error('[LandingEmbed] No landing ID'); return; }

  var appBase = '${frontendUrl}';

  var root = document.getElementById(rootId);
  if (!root) { console.error('[LandingEmbed] Root not found: ' + rootId); return; }

  // ── Ascundem titlul implicit al paginii Shopify ──────────────────────────
  var titleStyle = document.createElement('style');
  titleStyle.innerHTML =
    '.main-page-title, .page-title, h1.page-title, .section-header, .page-header,' +
    '.shopify-section-main-page .title, .shopify-section-main-page h1,' +
    '.rte h1, .page-width h1, #MainContent h1 { display: none !important; }' +
    // Prevenim scroll orizontal pe pagina Shopify (dar permitem scroll vertical normal)
    'html { overflow-x: hidden !important; }' +
    'body { overflow-x: hidden !important; }';
  document.head.appendChild(titleStyle);

  // Ascundere dinamică titluri (independent de temă)
  try {
    var hideSelectors = ['h1','.main-page-title','.page-title','.title','.section-header','.page-header'];
    var isHF = function(el) {
      var n = el;
      while (n && n !== document.body) {
        var t = (n.tagName||'').toLowerCase(), id = (n.id||'').toLowerCase(), c = String(n.className||'').toLowerCase();
        if (t==='header'||t==='footer'||id.indexOf('header')>-1||id.indexOf('footer')>-1||c.indexOf('header')>-1||c.indexOf('footer')>-1) return true;
        n = n.parentNode;
      }
      return false;
    };
    for (var i=0; i<hideSelectors.length; i++) {
      var els = document.querySelectorAll(hideSelectors[i]);
      for (var j=0; j<els.length; j++) {
        if (!root.contains(els[j]) && !isHF(els[j])) els[j].style.setProperty('display','none','important');
      }
    }
  } catch(e) {}

  // ── Full-bleed fără 100vw (evităm problema scrollbar Windows) ───────────
  // clientWidth exclude scrollbar-ul → nu provoacă overflow orizontal
  function applyFullBleed() {
    var vw = document.documentElement.clientWidth || document.body.clientWidth || window.innerWidth;
    var rect = root.getBoundingClientRect();
    var ml = -rect.left; // offset față de marginea stângă a viewport-ului
    root.style.setProperty('width', vw + 'px', 'important');
    root.style.setProperty('position', 'relative', 'important');
    root.style.setProperty('left', '0', 'important');
    root.style.setProperty('right', 'auto', 'important');
    root.style.setProperty('margin-left', ml + 'px', 'important');
    root.style.setProperty('margin-right', '0', 'important');
    root.style.setProperty('margin-top', '0', 'important');
    root.style.setProperty('margin-bottom', '0', 'important');
    root.style.setProperty('padding', '0', 'important');
    root.style.setProperty('box-sizing', 'border-box', 'important');
    root.style.setProperty('max-width', 'none', 'important');
    // Și iframe-ul să ocupe exact 100% din wrapper
    if (iframe) iframe.style.setProperty('width', '100%', 'important');
  }

  // ── Cream iframe-ul ──────────────────────────────────────────────────────
  var iframe = document.createElement('iframe');
  iframe.src = appBase + '/landing-preview/' + landingId;
  iframe.style.cssText = 'width:100%;border:none;min-height:100vh;display:block;';
  iframe.title = 'Landing Page';
  iframe.setAttribute('loading', 'eager');
  iframe.setAttribute('scrolling', 'no');
  root.appendChild(iframe);

  // Aplicăm full-bleed după ce DOM-ul e gata
  applyFullBleed();
  // Re-aplicăm la resize (responsive)
  window.addEventListener('resize', applyFullBleed);

  // ── Ascultăm înălțimea trimisă din iframe prin postMessage ───────────────
  window.addEventListener('message', function(e) {
    var data = e.data;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch(err) {} }
    if (data && data.type === 'landing-height') {
      var msgId = data.landingId ? String(data.landingId).trim().toLowerCase() : '';
      var localId = landingId ? String(landingId).trim().toLowerCase() : '';
      if (!localId || msgId === localId) {
        var h = parseInt(data.height, 10);
        if (h > 0) {
          iframe.style.setProperty('height', h + 'px', 'important');
          iframe.style.setProperty('min-height', h + 'px', 'important');
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
