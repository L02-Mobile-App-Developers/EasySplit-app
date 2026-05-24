import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { sendSuccess } from "../../lib/response";
import * as userService from "./user.service";

const router = Router();

// GET /me
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getMe(req.user!.userId);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
});

// PATCH /me
const updateMeSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

router.patch(
  "/",
  validate({ body: updateMeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.updateMe(req.user!.userId, req.body);
      sendSuccess(res, user, "Profile updated");
    } catch (err) {
      next(err);
    }
  },
);

// GET /me/subscription
router.get(
  "/subscription",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscription = await userService.getSubscription(req.user!.userId);
      sendSuccess(res, subscription);
    } catch (err) {
      next(err);
    }
  },
);

// GET /me/usage
router.get(
  "/usage",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usage = await userService.getUsage(req.user!.userId);
      sendSuccess(res, usage);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
