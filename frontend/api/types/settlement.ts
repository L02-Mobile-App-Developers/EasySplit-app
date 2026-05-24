import type { User } from "./auth";

export interface DebtEdge {
  fromUserId: string;
  toUserId: string;
  amount: number;
  fromUser: User | null;
  toUser: User | null;
}

export interface Settlement {
  id: string;
  groupId: string;

  fromUserId: string;
  toUserId: string;

  amount: number;
  note: string | null;

  createdBy: string;
  createdAt: string;

  fromUser: User | null;
  toUser: User | null;
  creator: User | null;
}

export interface SmartSettleTransfer {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export interface SmartSettleResponse {
  transfers: SmartSettleTransfer[];
  totalTransfers: number;
  generatedAt: string;
}

export interface GroupSettlementResponse {
  mode: "simulate" | "commit";
  totalSettlements: number;
  settlements: Settlement[];
  generatedAt: string;
}

export interface CreateSettlementRequest {
  fromUserId: string;
  toUserId: string;
  amount: number;
  note?: string;
}
