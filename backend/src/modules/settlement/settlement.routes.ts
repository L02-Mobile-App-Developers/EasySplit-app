import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { requireIdempotency } from "../../middleware/idempotency";
import { sendSuccess } from "../../lib/response";
import * as settlementService from "./settlement.service";

const router = Router({ mergeParams: true });

// ─── Schemas ────────────────────────────────────────────────────────

const smartSettleSchema = z.object({
  algorithm: z.enum(["min_transfer"]).default("min_transfer"),
  maxTransfers: z.number().int().min(1).max(100).default(50),
});

const createSettlementSchema = z.object({
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  amount: z.number().int().positive("Amount must be greater than 0"),
  note: z.string().max(255).optional(),
});

const groupSettlementSchema = z.object({
  mode: z.enum(["simulate", "commit"]),
  note: z.string().max(255).optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Debt Edges ─────────────────────────────────────────────────────

// GET /groups/:groupId/debts
router.get(
  "/debts",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const debts = await settlementService.getDebts(
        req.params.groupId as string,
        req.user!.userId,
      );
      sendSuccess(res, debts);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Smart Settle ───────────────────────────────────────────────────

// POST /groups/:groupId/smart-settle/suggestions
router.post(
  "/smart-settle/suggestions",
  validate({ body: smartSettleSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { algorithm, maxTransfers } = req.body;
      const result = await settlementService.generateSmartSettle(
        req.params.groupId as string,
        req.user!.userId,
        algorithm,
        maxTransfers,
      );
      sendSuccess(res, result, "Suggestion generated");
    } catch (err) {
      next(err);
    }
  },
);

// ─── Settlements ────────────────────────────────────────────────────

// POST /groups/:groupId/settlements
router.post(
  "/settlements",
  requireIdempotency(),
  validate({ body: createSettlementSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settlement = await settlementService.createSettlement(
        req.params.groupId as string,
        req.user!.userId,
        req.body,
        req.idempotencyRequestId,
      );
      sendSuccess(res, settlement, "Settlement created", undefined, 201);
    } catch (err) {
      next(err);
    }
  },
);

// GET /groups/:groupId/settlements
router.get(
  "/settlements",
  validate({ query: paginationSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      const result = await settlementService.getSettlements(
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

// GET /groups/:groupId/settlements/:settlementId
router.get(
  "/settlements/:settlementId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settlement = await settlementService.getSettlement(
        req.params.groupId as string,
        req.params.settlementId as string,
        req.user!.userId,
      );
      sendSuccess(res, settlement);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Group Settlement (Premium) ─────────────────────────────────────

// POST /groups/:groupId/group-settlement
router.post(
  "/group-settlement",
  requireIdempotency({ requiredWhen: (req) => req.body?.mode === "commit" }),
  validate({ body: groupSettlementSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await settlementService.groupSettlement(
        req.params.groupId as string,
        req.user!.userId,
        req.body,
        req.idempotencyRequestId,
      );
      sendSuccess(res, result, "Group settlement completed");
    } catch (err) {
      next(err);
    }
  },
);

export default router;
