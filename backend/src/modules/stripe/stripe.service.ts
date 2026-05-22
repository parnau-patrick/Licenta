import Stripe from "stripe";
import { env } from "../../config/env.js";
import { db } from "../../config/db.js";
import { emitToUser, emitToAdmins } from "../../config/socket.js";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
});

export async function createCheckoutSession(userId: string, priceId: string) {
  // Găsim sau creăm customer Stripe
  let user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  let customerId = user.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email });
    customerId = customer.id;
    await db.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${env.FRONTEND_ORIGIN}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.FRONTEND_ORIGIN}/pricing`,
    metadata: { userId },
  });

  return session;
}

export async function handleStripeWebhook(payload: Buffer, signature: string) {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) break;

      // Determină planul din price ID
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;

      let plan: "STARTER" | "PRO" = "STARTER";
      if (priceId === env.STRIPE_PRICE_ID_PRO) plan = "PRO";

      await db.user.update({
        where: { id: userId },
        data: {
          plan,
          stripeSubscriptionId: session.subscription as string,
        },
      });

      // Notifică userul în real-time despre noul plan
      emitToUser(userId, "user:plan-updated", { plan });
      emitToAdmins("admin:plan-updated", { userId, plan });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const updatedUsers = await db.user.findMany({
        where: { stripeSubscriptionId: sub.id },
        select: { id: true },
      });
      await db.user.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { plan: "FREE", stripeSubscriptionId: null },
      });
      updatedUsers.forEach(u => emitToUser(u.id, "user:plan-updated", { plan: "FREE" }));
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price?.id;
      let plan: "FREE" | "STARTER" | "PRO" = "FREE";
      if (priceId === env.STRIPE_PRICE_ID_STARTER) plan = "STARTER";
      if (priceId === env.STRIPE_PRICE_ID_PRO) plan = "PRO";

      await db.user.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { plan },
      });
      break;
    }
  }

  return { received: true };
}

export async function cancelSubscription(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.stripeSubscriptionId) throw new Error("Niciun abonament activ.");

  await stripe.subscriptions.cancel(user.stripeSubscriptionId);
  await db.user.update({
    where: { id: userId },
    data: { plan: "FREE", stripeSubscriptionId: null },
  });

  return { message: "Abonamentul a fost anulat." };
}
