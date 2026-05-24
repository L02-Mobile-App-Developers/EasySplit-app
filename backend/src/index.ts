import type { Server } from "http";
import { app } from "./app";
import { config } from "./config";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { initializeFirebaseAdmin } from "./lib/firebase-admin";
import { logger } from "./middleware/logger";

let server: Server | undefined;

async function bootstrap(): Promise<void> {
  await connectDatabase();

  if (config.nodeEnv === "production" || config.nodeEnv === "staging") {
    const firebaseApp = initializeFirebaseAdmin();
    logger.info(
      {
        projectId: config.firebase.projectId ?? firebaseApp.options.projectId,
      },
      "Firebase Admin initialized",
    );
  }

  server = app.listen(config.port, () => {
    logger.info(`EasySplit API server running on port ${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
  });
}

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, "Shutting down EasySplit API server");

  server?.close(() => {
    disconnectDatabase()
      .catch((error) => {
        logger.error({ error }, "Failed to disconnect database cleanly");
      })
      .finally(() => process.exit(0));
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

bootstrap().catch((error) => {
  logger.error({ error }, "Failed to start EasySplit API server");
  process.exit(1);
});
