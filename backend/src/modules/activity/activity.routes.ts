import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { sendSuccess } from "../../lib/response";
import * as activityService from "./activity.service";

const router = Router({ mergeParams: true });

// ─── Schemas ────────────────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  from: z.string().optional(),
  to: z.string().optional(),
  actorId: z.string().uuid().optional(),
  type: z
    .enum(["expense", "settlement", "reminder", "member", "group"])
    .optional(),
});

// ─── Routes ─────────────────────────────────────────────────────────

// GET /groups/:groupId/activities
router.get(
  "/activities",
  validate({ query: paginationSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      const result = await activityService.getActivities(
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

// GET /groups/:groupId/history
router.get(
  "/history",
  validate({ query: historyQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, from, to, actorId, type } = req.query as unknown as {
        page: number;
        limit: number;
        from?: string;
        to?: string;
        actorId?: string;
        type?: string;
      };
      const result = await activityService.getHistory(
        req.params.groupId as string,
        req.user!.userId,
        { page, limit, from, to, actorId, type },
      );
      sendSuccess(res, result.items, "OK", {
        pagination: result.pagination,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
