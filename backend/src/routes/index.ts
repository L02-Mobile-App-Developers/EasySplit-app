import { Router, Request, Response } from "express";
import { sendSuccess } from "../lib/response";
import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/user/user.routes";
import groupRoutes from "../modules/group/group.routes";
import expenseRoutes from "../modules/expense/expense.routes";
import balanceRoutes from "../modules/balance/balance.routes";
import settlementRoutes from "../modules/settlement/settlement.routes";
import reminderRoutes from "../modules/reminder/reminder.routes";
import activityRoutes from "../modules/activity/activity.routes";

const router = Router();

// Health check
router.get("/health", (_req: Request, res: Response) => {
  sendSuccess(res, { status: "ok", timestamp: new Date().toISOString() });
});

// Auth routes
router.use("/auth", authRoutes);

// User / Me routes
router.use("/me", userRoutes);

// Group routes
router.use("/groups", groupRoutes);

// Expense routes (nested under groups)
router.use("/groups/:groupId/expenses", expenseRoutes);

// Balance routes (nested under groups)
router.use("/groups/:groupId/balances", balanceRoutes);

// Settlement & Smart Settle routes
router.use("/groups/:groupId", settlementRoutes);

// Reminder routes (nested under groups)
router.use("/groups/:groupId/reminders", reminderRoutes);

// Activity & History routes (nested under groups)
router.use("/groups/:groupId", activityRoutes);



export default router;
