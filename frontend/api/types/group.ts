export type GroupCategory = "trip" | "food" | "roommate" | "project" | "other";

export interface Group {
  id: string;
  name: string;
  category: GroupCategory;
  ownerId: string;
  status: "active" | "closed";
  role: "owner" | "admin" | "member";
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

export interface GroupMemberSuccess {
  userId: string;
  role: "admin" | "member";
  joinedAt: string;
}

export interface CreateGroupRequest {
  name: string;
  category: GroupCategory;
  members?: string[];
}
