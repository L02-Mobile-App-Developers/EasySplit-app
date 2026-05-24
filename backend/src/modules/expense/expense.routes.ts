import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { requireIdempotency } from "../../middleware/idempotency";
import { sendSuccess } from "../../lib/response";
import * as expenseService from "./expense.service";

const router = Router({ mergeParams: true });

// --- Schemas ---

const participantSchema = z.object({
  userId: z.string().uuid(),
  value: z.number().int().min(0),
});

const createExpenseSchema = z.object({
  description: z.string().min(1, "Description is required").max(255),
  amount: z.number().int().positive("amount must be greater than 0"),
  currency: z.string().length(3).default("VND"),
  paidByUserId: z.string().uuid(),
  splitMode: z.enum(["equal", "amount", "percent", "weight"]),
  participants: z.array(participantSchema).min(1, "At least one participant required"),
});

const updateExpenseSchema = z.object({
  description: z.string().min(1).max(255).optional(),
  amount: z.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
  paidByUserId: z.string().uuid().optional(),
  splitMode: z.enum(["equal", "amount", "percent", "weight"]).optional(),
  participants: z.array(participantSchema).min(1).optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// --- Routes ---

// POST /groups/:groupId/expenses
router.post(
  "/",
  requireIdempotency(),
  validate({ body: createExpenseSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await expenseService.createExpense(
        req.params.groupId as string,
        req.user!.userId,
        req.body,
        req.idempotencyRequestId,
      );
      sendSuccess(res, result, "Expense created", undefined, 201);
    } catch (err) {
      next(err);
    }
  },
);

// GET /groups/:groupId/expenses
router.get(
  "/",
  validate({ query: paginationSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      const result = await expenseService.getExpenses(
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

// GET /groups/:groupId/expenses/:expenseId
router.get(
  "/:expenseId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const expense = await expenseService.getExpense(
        req.params.groupId as string,
        req.params.expenseId as string,
        req.user!.userId,
      );
      sendSuccess(res, expense);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /groups/:groupId/expenses/:expenseId
router.patch(
  "/:expenseId",
  validate({ body: updateExpenseSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await expenseService.updateExpense(
        req.params.groupId as string,
        req.params.expenseId as string,
        req.user!.userId,
        req.body,
        req.idempotencyRequestId,
      );
      sendSuccess(res, result, "Expense updated");
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /groups/:groupId/expenses/:expenseId
router.delete(
  "/:expenseId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await expenseService.deleteExpense(
        req.params.groupId as string,
        req.params.expenseId as string,
        req.user!.userId,
        req.idempotencyRequestId,
      );
      sendSuccess(res, result, "Expense deleted");
    } catch (err) {
      next(err);
    }
  },
);

export default router;
