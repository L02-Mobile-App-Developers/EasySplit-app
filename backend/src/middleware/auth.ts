import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { UnauthorizedError } from "../lib/errors";
import { verifyFirebaseIdToken } from "../lib/firebase-admin";
import { syncFirebaseUser } from "../modules/auth/auth.service";

export interface AuthPayload {
  userId: string;
  email: string | null;
  firebaseUid?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  authenticateRequest(req).then(() => next()).catch(next);
}

async function authenticateRequest(req: Request): Promise<void> {
  // Dev mode: allow X-User-Id header for local development
  if (config.nodeEnv !== "production" && config.devAuth.enabled) {
    const devUserId = req.headers["x-user-id"] as string | undefined;
    if (devUserId) {
      req.user = { userId: devUserId, email: `${devUserId}@dev.local` };
      return;
    }
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  const token = authHeader.split(" ")[1];

  if (config.nodeEnv === "production" || config.nodeEnv === "staging") {
    try {
      const decoded = await verifyFirebaseIdToken(token);
      const user = await syncFirebaseUser({
        firebaseUid: decoded.uid,
        email: decoded.email ?? null,
        displayName: decoded.name ?? null,
        avatarUrl: decoded.picture ?? null,
      });
      req.user = {
        userId: user.id,
        email: user.email,
        firebaseUid: decoded.uid,
      };
      return;
    } catch {
      throw new UnauthorizedError("Invalid or expired Firebase token");
    }
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret) as AuthPayload;
    req.user = payload;
  } catch {
    try {
      const decoded = await verifyFirebaseIdToken(token);
      const user = await syncFirebaseUser({
        firebaseUid: decoded.uid,
        email: decoded.email ?? null,
        displayName: decoded.name ?? null,
        avatarUrl: decoded.picture ?? null,
      });
      req.user = {
        userId: user.id,
        email: user.email,
        firebaseUid: decoded.uid,
      };
    } catch {
      throw new UnauthorizedError("Invalid or expired token");
    }
  }
}
