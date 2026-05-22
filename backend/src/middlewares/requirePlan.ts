import { NextFunction, Request, Response } from "express";

type PlanLevel = "FREE" | "STARTER" | "PRO";

const PLAN_ORDER: Record<PlanLevel, number> = {
  FREE: 0,
  STARTER: 1,
  PRO: 2,
};

/**
 * Middleware care verifică că utilizatorul are cel puțin planul specificat.
 * Exemplu: requirePlan("STARTER") blochează userii FREE.
 */
export function requirePlan(minPlan: PlanLevel) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPlan = (req.user?.plan ?? "FREE") as PlanLevel;

    if (PLAN_ORDER[userPlan] >= PLAN_ORDER[minPlan]) {
      next();
      return;
    }

    const messages: Record<PlanLevel, string> = {
      FREE: "",
      STARTER: "Această funcționalitate necesită planul Starter sau Pro. Fă upgrade pentru a continua.",
      PRO: "Această funcționalitate necesită planul Pro. Fă upgrade pentru acces complet.",
    };

    res.status(403).json({
      error: messages[minPlan],
      requiredPlan: minPlan,
      currentPlan: userPlan,
    });
  };
}
