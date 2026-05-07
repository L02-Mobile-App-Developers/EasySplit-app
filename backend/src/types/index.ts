export type PlanStatus = "free" | "premium";
export type SubscriptionStatus = "trialing" | "active" | "grace_period" | "canceled" | "expired";
export type GroupCategory = "trip" | "food" | "roommate" | "project" | "other";
export type GroupStatus = "active" | "closed";
export type MemberRole = "owner" | "admin" | "member";
export type SplitMode = "equal" | "amount" | "percent" | "weight";
export type ReminderType = "debt_reminder";
export type ReminderStatus = "queued" | "sent" | "failed";
export type ReminderChannel = "in_app";
export type GroupSettlementMode = "simulate" | "commit";
export type ActivityType = "expense" | "settlement" | "reminder" | "member" | "group";

export interface PaginationParams {
  page: number;
  limit: number;
}
