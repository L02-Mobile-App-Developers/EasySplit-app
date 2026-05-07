import { app } from "./app";
import { config } from "./config";
import { logger } from "./middleware/logger";

app.listen(config.port, () => {
  logger.info(`EasySplit API server running on port ${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
});
