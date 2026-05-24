export interface ParticipantInput {
  userId: string;
  value: number;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  paidByUserId: string;
  splitMode: "equal" | "amount" | "percent" | "weight";

  createdBy: string;
}

export interface CreateExpenseInput {
  description: string;
  amount: number;
  currency?: string;
  paidByUserId: string;

  splitMode: "equal" | "amount" | "percent" | "weight";

  participants: ParticipantInput[];
}
