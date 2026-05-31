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

const updateSubscriptionSchema = z.object({
  plan: z.enum(["free", "premium"]),
  status: z.enum(["trialing", "active", "grace_period", "canceled", "expired"]).optional(),
  currentPeriodStart: z.string().datetime().nullable().optional(),
  currentPeriodEnd: z.string().datetime().nullable().optional(),
});

const handleUpdateSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const subscription = await userService.updateSubscription(req.user!.userId, {
      plan: req.body.plan,
      status: req.body.status,
      currentPeriodStart:
        req.body.currentPeriodStart !== undefined ? new Date(req.body.currentPeriodStart) : undefined,
      currentPeriodEnd:
        req.body.currentPeriodEnd !== undefined ? new Date(req.body.currentPeriodEnd) : undefined,
    });

    sendSuccess(res, subscription, "Subscription updated");
  } catch (err) {
    next(err);
  }
};

// POST /me/subscription
router.post("/subscription", validate({ body: updateSubscriptionSchema }), handleUpdateSubscription);

// PATCH /me/subscription
router.patch(
  "/subscription",
  validate({ body: updateSubscriptionSchema }),
  handleUpdateSubscription,
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
