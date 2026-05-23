import { hashPassword, verifyPassword } from "../../lib/password";
import { signAccessToken, signRefreshToken, verifyToken } from "../../lib/jwt";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../lib/errors";
import { config } from "../../config";
import type { AuthPayload } from "../../middleware/auth";
import {
  AppUser,
  cleanForFirestore,
  collectionNames,
  collectionRef,
  createId,
  docRef,
  getDoc,
  getFirstByField,
  subscriptionId,
} from "../../lib/firestore-db";

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

async function createUserWithFreeSubscription(user: AppUser) {
  const now = new Date();
  const batch = collectionRef(collectionNames.users).firestore.batch();

  batch.set(docRef(collectionNames.users, user.id), cleanForFirestore(user));
  batch.set(
    docRef(collectionNames.subscriptions, subscriptionId(user.id)),
    cleanForFirestore({
      id: createId(),
      userId: user.id,
      plan: "free",
      status: "active",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      createdAt: now,
      updatedAt: now,
    }),
  );

  await batch.commit();
}

async function assertEmailAvailable(email: string, userId?: string) {
  const emailOwner = await getFirstByField<AppUser>(
    collectionNames.users,
    "email",
    email,
  );
  if (emailOwner && emailOwner.id !== userId) {
    throw new ConflictError("Email already registered");
  }
}

export async function syncFirebaseUser(input: FirebaseUserInput) {
  const displayName =
    input.displayName?.trim() ||
    input.email?.split("@")[0] ||
    "Firebase User";

  const existingByFirebaseUid = await getFirstByField<AppUser>(
    collectionNames.users,
    "firebaseUid",
    input.firebaseUid,
  );

  if (existingByFirebaseUid) {
    if (input.email) {
      await assertEmailAvailable(input.email, existingByFirebaseUid.id);
    }

    const user: AppUser = {
      ...existingByFirebaseUid,
      email: input.email ?? existingByFirebaseUid.email,
      displayName,
      avatarUrl: input.avatarUrl ?? existingByFirebaseUid.avatarUrl,
    };
    await docRef(collectionNames.users, user.id).set(cleanForFirestore(user));
    return toPublicUser(user);
  }

  const existingByEmail = input.email
    ? await getFirstByField<AppUser>(
        collectionNames.users,
        "email",
        input.email,
      )
    : null;

  if (existingByEmail) {
    const user: AppUser = {
      ...existingByEmail,
      firebaseUid: input.firebaseUid,
      displayName,
      avatarUrl: input.avatarUrl ?? existingByEmail.avatarUrl,
    };
    await docRef(collectionNames.users, user.id).set(cleanForFirestore(user));
    return toPublicUser(user);
  }

  const now = new Date();
  const user: AppUser = {
    id: createId(),
    firebaseUid: input.firebaseUid,
    email: input.email ?? null,
    displayName,
    passwordHash: null,
    avatarUrl: input.avatarUrl ?? null,
    createdAt: now,
  };

  await createUserWithFreeSubscription(user);

  return toPublicUser(user);
}

export async function getCurrentUser(userId: string) {
  const user = await getDoc<AppUser>(collectionNames.users, userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return toPublicUser(user);
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  assertLocalJwtAuthAllowed();
  await assertEmailAvailable(input.email);

  const now = new Date();
  const user: AppUser = {
    id: createId(),
    firebaseUid: null,
    email: input.email,
    displayName: input.displayName,
    passwordHash: hashPassword(input.password),
    avatarUrl: null,
    createdAt: now,
  };

  await createUserWithFreeSubscription(user);

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

  const user = await getFirstByField<AppUser>(
    collectionNames.users,
    "email",
    input.email,
  );
  if (!user || !user.passwordHash) {
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

  const user = await getDoc<AppUser>(collectionNames.users, payload.userId);
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
