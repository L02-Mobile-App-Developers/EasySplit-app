import { prisma } from "../../lib/prisma";
import { hashPassword, verifyPassword } from "../../lib/password";
import { signAccessToken, signRefreshToken, verifyToken } from "../../lib/jwt";
import { ConflictError, UnauthorizedError } from "../../lib/errors";
import { config } from "../../config";
import { AuthPayload } from "../../middleware/auth";

interface RegisterInput {
  email: string;
  displayName: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResult {
  user: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new ConflictError("Email already registered");
  }

  const passwordHash = hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      displayName: input.displayName,
      passwordHash,
      subscription: {
        create: {
          plan: "free",
          status: "active",
        },
      },
    },
  });

  const payload: AuthPayload = { userId: user.id, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return {
    user: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
    accessToken,
    refreshToken,
  };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const valid = verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const payload: AuthPayload = { userId: user.id, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return {
    user: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
    accessToken,
    refreshToken,
  };
}

export async function refreshToken(token: string): Promise<AuthResult> {
  let payload: AuthPayload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });
  if (!user) {
    throw new UnauthorizedError("User not found");
  }

  const newPayload: AuthPayload = { userId: user.id, email: user.email };
  const accessToken = signAccessToken(newPayload);
  const refreshToken = signRefreshToken(newPayload);

  return {
    user: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
    accessToken,
    refreshToken,
  };
}



