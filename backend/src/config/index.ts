import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const nodeEnv = process.env.NODE_ENV || "development";
const devAuthEnabled = process.env.DEV_AUTH_ENABLED === "true";

if (nodeEnv === "production" && devAuthEnabled) {
  throw new Error("DEV_AUTH_ENABLED must be false in production");
}

export const config = {
  port: parseInt(process.env.PORT || "8080", 10),
  nodeEnv,

  database: {
    url: process.env.DATABASE_URL || "postgresql://easysplit:easysplit@localhost:5432/easysplit?schema=public",
  },

  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-key-do-not-use-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },

  freeTier: {
    maxGroups: parseInt(process.env.FREE_MAX_GROUPS || "3", 10),
    smartSettlePerMonth: parseInt(process.env.FREE_SMART_SETTLE_PER_MONTH || "3", 10),
    historyDays: parseInt(process.env.FREE_HISTORY_DAYS || "90", 10),
  },

  idempotency: {
    windowHours: parseInt(process.env.IDEMPOTENCY_WINDOW_HOURS || "24", 10),
    processingTimeoutSeconds: parseInt(
      process.env.IDEMPOTENCY_PROCESSING_TIMEOUT_SECONDS || "30",
      10,
    ),
  },

  devAuth: {
    enabled: devAuthEnabled,
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    serviceAccountBase64: process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
  },
} as const;

export type Config = typeof config;
