export interface Subscription {
  plan: "free" | "premium";
  status:
    | "trialing"
    | "active"
    | "grace_period"
    | "canceled"
    | "expired"
    | "inactive";
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

export interface Usage {
  groupCount: number;
  smartSettleUsedThisMonth: number;
  freeMaxGroups: number;
  freeSmartSettlePerMonth: number;
}

// chua
export interface UpdateMeRequest {
  displayName?: string;
  avatarUrl?: string | null;
}
