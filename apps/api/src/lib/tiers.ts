export type PlanTier = "INVITED" | "SUBSCRIBER" | "SUBSCRIBER_PLUS";

const rank: Record<PlanTier, number> = {
  INVITED: 0,
  SUBSCRIBER: 1,
  SUBSCRIBER_PLUS: 2,
};

export function hasTierAccess(userTier: PlanTier, minTier: PlanTier) {
  return (rank[userTier] ?? 0) >= (rank[minTier] ?? 0);
}
