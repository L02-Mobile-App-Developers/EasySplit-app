import { Router, Request, Response, NextFunction } from "express";
import { checkFirestoreConnection } from "../lib/firebase-admin";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

router.get(
  "/ready",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await checkFirestoreConnection();

      res.status(200).json({
        status: "ok",
        checks: {
          database: "firestore",
          firestore: "ok",
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
