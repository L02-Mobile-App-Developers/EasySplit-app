import jwt from "jsonwebtoken";
import { config } from "../config";
import { AuthPayload } from "../middleware/auth";

export function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as string & jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn as string & jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, config.jwt.secret) as AuthPayload;
}
