import type { User } from "./auth";

export type SplitMode = "equal" | "amount" | "percent" | "weight";

export interface ExpenseParticipant {
  expenseId: string;
  userId: string;
  value: number;
  user: User | null;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  paidByUserId: string;
  splitMode: SplitMode;

  createdBy: string;
  createdAt: string;
  updatedAt: string;

  participants: ExpenseParticipant[];
  payer: User | null;
  creator: User | null;
}

export interface ParticipantInput {
  userId: string;
  value: number;
}

export interface CreateExpenseRequest {
  description: string;
  amount: number;
  currency?: string;
  paidByUserId: string;
  splitMode: SplitMode;
  participants: ParticipantInput[];
}

export interface UpdateExpenseRequest {
  description?: string;
  amount?: number;
  currency?: string;
  paidByUserId?: string;
  splitMode?: SplitMode;
  participants?: ParticipantInput[];
}
