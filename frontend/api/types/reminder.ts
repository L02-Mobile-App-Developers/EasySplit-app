export type ReminderChannel = "in_app" | "email" | "sms";

export type ReminderStatus = "queued" | "sent" | "failed";

export type ReminderType = "debt_reminder";

export interface ReminderUser {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface Reminder {
  id: string;
  groupId: string;

  targetUserId: string;
  targetUser?: ReminderUser | null;

  createdBy: string;
  creator?: ReminderUser | null;

  type: ReminderType;
  status: ReminderStatus;

  message: string;
  channel: ReminderChannel;

  scheduledAt: string;
  createdAt: string;
}

export interface CreateReminderRequest {
  targetUserIds: string[];

  channel?: ReminderChannel;

  messageTemplate?: string;

  scheduledAt?: string;
}

export interface GetRemindersParams {
  page?: number;
  limit?: number;
}
