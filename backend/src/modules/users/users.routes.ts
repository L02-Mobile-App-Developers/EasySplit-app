import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { sendSuccess } from "../../lib/response";
import * as usersService from "./users.service";

const router = Router();

// GET /users?q=...&page=1&limit=20
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const page = parseInt((req.query.page as string) ?? "1", 10) || 1;
      const limit = parseInt((req.query.limit as string) ?? "20", 10) || 20;
      const exclude = req.user ? req.user.userId : undefined;

      const result = await usersService.searchUsers(q, page, limit, exclude);
      sendSuccess(res, result.items, "OK", { pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
