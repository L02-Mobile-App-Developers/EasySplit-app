import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { logger } from "./middleware/logger";
import { errorHandler } from "./middleware/error-handler";
import { authenticate } from "./middleware/auth";
import { idempotency } from "./middleware/idempotency";
import routes from "./routes";

const app = express();

// Global middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(idempotency);

// Request logging
app.use((req, _res, next) => {
  logger.debug({ method: req.method, url: req.url }, "Incoming request");
  next();
});

// Auth (applied to all routes)
app.use(authenticate);

// Routes
app.use("/api/v1", routes);

// Error handler (must be last)
app.use(errorHandler);

export { app };
