export const PLAN_IDS = ["free", "pro"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const PLAN_GENERATION_MAX: Record<PlanId, number> = {
  free: 8,
  pro: 40,
};

export const PLAN_PRO_PRICE_LABEL = "12 € / mois";

export function isPlanId(value: string | null | undefined): value is PlanId {
  return value === "free" || value === "pro";
}

export function normalizePlan(value: string | null | undefined): PlanId {
  return isPlanId(value) ? value : "free";
}

export function generationMaxForPlan(plan: PlanId): number {
  return PLAN_GENERATION_MAX[plan];
}
