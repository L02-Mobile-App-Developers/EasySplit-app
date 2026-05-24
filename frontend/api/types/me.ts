export interface Subscription {
  plan: "free";
  status: "active" | "inactive";
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
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
