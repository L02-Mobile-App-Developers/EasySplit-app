import type { User } from "./auth";

export interface Balance {
  id: string;
  balance: number;
  groupId: string;
  userId: string;
  user: User | null;
}
