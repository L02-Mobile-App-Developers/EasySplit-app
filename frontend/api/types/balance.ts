import type { User } from "./auth";

export interface Balance {
  groupId: string;

  userId: string;

  balance: number;

  user: User | null;
}
