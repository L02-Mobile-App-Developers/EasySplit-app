export type ActivityType =
  | "expense"
  | "settlement"
  | "reminder"
  | "member"
  | "group";

export interface AuditLog {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationMeta {
  pagination: Pagination;
}

export interface ActivityQuery {
  page?: number;
  limit?: number;
}

export interface HistoryQuery extends ActivityQuery {
  from?: string;
  to?: string;
  actorId?: string;
  type?: ActivityType;
}

export interface HistoryMeta {
  from?: string;
  to?: string;
  actorId?: string;
  type?: ActivityType;
}

export interface ActivityResponse {
  items: AuditLog[];
  pagination: Pagination;
}

export interface HistoryResponse {
  items: AuditLog[];
  pagination: Pagination;
  meta?: HistoryMeta;
}
