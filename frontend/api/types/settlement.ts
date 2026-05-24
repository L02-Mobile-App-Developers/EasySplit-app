import type { PublicUser } from "./user";

export interface DebtEdge {
  fromUserId: string;
  toUserId: string;
  amount: number;

  fromUser: PublicUser | null;
  toUser: PublicUser | null;
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

  fromUser: PublicUser | null;
  toUser: PublicUser | null;
  creator: PublicUser | null;
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
