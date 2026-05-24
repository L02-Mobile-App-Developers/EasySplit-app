import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { sendSuccess } from "../../lib/response";
import * as friendService from "./friend.service";

const router = Router();

const sendReqSchema = z.object({ email: z.string().email() });

// POST /friends { email }
router.post(
  "/",
  validate({ body: sendReqSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const from = req.user!.userId;
      const payload = req.body as { email: string };
      const result = await friendService.sendFriendRequest(from, payload.email);
      sendSuccess(res, result, "Friend request sent", undefined, 201);
    } catch (err) {
      next(err);
    }
  },
);

// POST /friends/:id/accept
router.post(
  "/:id/accept",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const requestId = req.params.id as string;
      const result = await friendService.acceptFriendRequest(userId, requestId);
      sendSuccess(res, result, "Friend request accepted");
    } catch (err) {
      next(err);
    }
  },
);

// GET /friends -> list friends
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const items = await friendService.listFriends(userId);
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  },
);

// GET /friends/requests -> incoming pending requests
router.get(
  "/requests",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const items = await friendService.listIncomingRequests(userId);
      sendSuccess(res, items);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /friends/:id -> reject or cancel friend request
router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const requestId = req.params.id as string;
      const result = await friendService.rejectOrCancelFriendRequest(userId, requestId);
      sendSuccess(res, result, "Friend request cancelled/rejected");
    } catch (err) {
      next(err);
    }
  },
);

export default router;
