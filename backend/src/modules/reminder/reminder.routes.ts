import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { sendSuccess } from "../../lib/response";
import * as reminderService from "./reminder.service";

const router = Router({ mergeParams: true });

// ─── Schemas ────────────────────────────────────────────────────────

const createReminderSchema = z.object({
  targetUserIds: z.array(z.string().uuid()).min(1, "At least one target user required"),
  channel: z.enum(["in_app", "email", "sms"]).default("in_app"),
  messageTemplate: z.string().max(500).optional(),
  scheduledAt: z.string().datetime().optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Routes ─────────────────────────────────────────────────────────

// POST /groups/:groupId/reminders
router.post(
  "/",
  validate({ body: createReminderSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reminders = await reminderService.createReminder(
        req.params.groupId as string,
        req.user!.userId,
        req.body,
      );
      sendSuccess(res, reminders, "Reminders created", undefined, 201);
    } catch (err) {
      next(err);
    }
  },
);

// GET /groups/:groupId/reminders
router.get(
  "/",
  validate({ query: paginationSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      const result = await reminderService.getReminders(
        req.params.groupId as string,
        req.user!.userId,
        page,
        limit,
      );
      sendSuccess(res, result.items, "OK", { pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  },
);

// POST /groups/:groupId/reminders/:reminderId/cancel
router.post(
  "/:reminderId/cancel",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reminder = await reminderService.cancelReminder(
        req.params.groupId as string,
        req.params.reminderId as string,
        req.user!.userId,
      );
      sendSuccess(res, reminder, "Reminder canceled");
    } catch (err) {
      next(err);
    }
  },
);

export default router;
