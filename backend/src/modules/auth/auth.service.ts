import { prisma } from "../../lib/prisma";
import { hashPassword, verifyPassword } from "../../lib/password";
import { signAccessToken, signRefreshToken, verifyToken } from "../../lib/jwt";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../lib/errors";
import { config } from "../../config";
import type { AuthPayload } from "../../middleware/auth";

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
    email: string | null;
    avatarUrl: string | null;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

export interface FirebaseUserInput {
  firebaseUid: string;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

function assertLocalJwtAuthAllowed() {
  if (config.nodeEnv === "production") {
    throw new UnauthorizedError("Local JWT auth is disabled in production");
  }
}

function toPublicUser(user: {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

export async function syncFirebaseUser(input: FirebaseUserInput) {
  const displayName =
    input.displayName?.trim() ||
    input.email?.split("@")[0] ||
    "Firebase User";

  const existingByFirebaseUid = await prisma.user.findUnique({
    where: { firebaseUid: input.firebaseUid },
  });

  if (existingByFirebaseUid) {
    const user = await prisma.user.update({
      where: { id: existingByFirebaseUid.id },
      data: {
        email: input.email ?? existingByFirebaseUid.email,
        displayName,
        avatarUrl: input.avatarUrl ?? existingByFirebaseUid.avatarUrl,
      },
    });
    return toPublicUser(user);
  }

  const existingByEmail = input.email
    ? await prisma.user.findUnique({ where: { email: input.email } })
    : null;

  if (existingByEmail) {
    const user = await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        firebaseUid: input.firebaseUid,
        displayName,
        avatarUrl: input.avatarUrl ?? existingByEmail.avatarUrl,
      },
    });
    return toPublicUser(user);
  }

  const user = await prisma.user.create({
    data: {
      firebaseUid: input.firebaseUid,
      email: input.email ?? null,
      displayName,
      avatarUrl: input.avatarUrl ?? null,
      subscription: {
        create: {
          plan: "free",
          status: "active",
        },
      },
    },
  });

  return toPublicUser(user);
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return toPublicUser(user);
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  assertLocalJwtAuthAllowed();

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
    user: toPublicUser(user),
    accessToken,
    refreshToken,
  };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  assertLocalJwtAuthAllowed();

  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  if (!user.passwordHash) {
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
    user: toPublicUser(user),
    accessToken,
    refreshToken,
  };
}

export async function refreshToken(token: string): Promise<AuthResult> {
  assertLocalJwtAuthAllowed();

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
    user: toPublicUser(user),
    accessToken,
    refreshToken,
  };
}



