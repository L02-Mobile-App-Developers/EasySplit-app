import { logger } from "../middleware/logger";
import { checkFirestoreConnection } from "../lib/firebase-admin";

export async function connectDatabase(): Promise<void> {
  try {
    await checkFirestoreConnection();
    logger.info("Firestore connected successfully");
  } catch (error) {
    logger.error({ error }, "Failed to connect to Firestore");
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  logger.info("Firestore connection closed");
}
