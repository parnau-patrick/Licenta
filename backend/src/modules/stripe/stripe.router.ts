import { Router, Request, Response } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { createCheckoutSession, handleStripeWebhook, cancelSubscription } from "./stripe.service.js";
import { env } from "../../config/env.js";
import express from "express";

export const stripeRouter = Router();

// POST /api/stripe/create-checkout
stripeRouter.post("/create-checkout", requireAuth, async (req: Request, res: Response) => {
  try {
    const { plan } = req.body as { plan: "STARTER" | "PRO" };
    if (!plan || !["STARTER", "PRO"].includes(plan)) {
      res.status(400).json({ error: "Plan invalid. Alege STARTER sau PRO." });
      return;
    }

    const priceId = plan === "STARTER" ? env.STRIPE_PRICE_ID_STARTER : env.STRIPE_PRICE_ID_PRO;
    const session = await createCheckoutSession(req.user!.userId, priceId);
    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stripe/webhook — Stripe trimite evenimente aici
// IMPORTANT: trebuie raw body, nu JSON parsat
stripeRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;
    try {
      const result = await handleStripeWebhook(req.body as Buffer, sig);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// POST /api/stripe/cancel — anulează abonamentul
stripeRouter.post("/cancel", requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await cancelSubscription(req.user!.userId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
