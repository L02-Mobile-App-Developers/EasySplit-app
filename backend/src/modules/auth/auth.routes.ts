import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { sendSuccess } from "../../lib/response";
import * as authService from "./auth.service";

const router = Router();

// POST /auth/register
const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  displayName: z.string().min(1, "Display name is required").max(80),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

router.post(
  "/register",
  validate({ body: registerSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(req.body);
      sendSuccess(res, result, "Registration successful", undefined, 201);
    } catch (err) {
      next(err);
    }
  },
);

// POST /auth/login
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

router.post(
  "/login",
  validate({ body: loginSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body);
      sendSuccess(res, result, "Login successful");
    } catch (err) {
      next(err);
    }
  },
);

// POST /auth/refresh-token
const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

router.post(
  "/refresh-token",
  validate({ body: refreshSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.refreshToken(req.body.refreshToken);
      sendSuccess(res, result, "Token refreshed");
    } catch (err) {
      next(err);
    }
  },
);

// POST /auth/logout (stateless — no server-side action needed)
router.post("/logout", (_req: Request, res: Response) => {
  sendSuccess(res, null, "Logged out");
});

export default router;
