export interface Me {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface UpdateMeRequest {
  displayName?: string;
  avatarUrl?: string | null;
}

export interface Subscription {
  plan: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

export interface Usage {
  groupCount: number;
  smartSettleUsedThisMonth: number;
  freeMaxGroups: number;
  freeSmartSettlePerMonth: number;
}

export interface PublicUser {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl?: string | null;
}
