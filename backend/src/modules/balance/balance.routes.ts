import { Router, Request, Response, NextFunction } from "express";
import { sendSuccess } from "../../lib/response";
import * as balanceService from "./balance.service";

const router = Router({ mergeParams: true });

// GET /groups/:groupId/balances
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const balances = await balanceService.getBalances(
        req.params.groupId as string,
        req.user!.userId,
      );
      sendSuccess(res, balances);
    } catch (err) {
      next(err);
    }
  },
);

// GET /groups/:groupId/balances/me
router.get(
  "/me",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const balance = await balanceService.getMyBalance(
        req.params.groupId as string,
        req.user!.userId,
      );
      sendSuccess(res, balance);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
