import express from "express";
import cors from "cors";
import helmet from "helmet";
import { logger } from "./middleware/logger";
import { errorHandler } from "./middleware/error-handler";
import { authenticate } from "./middleware/auth";
import routes from "./routes";
import healthRoutes from "./routes/health";
import authRoutes from "./modules/auth/auth.routes";

const app = express();

// Global middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  logger.debug({ method: req.method, url: req.url }, "Incoming request");
  next();
});

// Auth routes (public — no authentication required)
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", healthRoutes);

// Auth (applied to all routes)
app.use(authenticate);

// Routes
app.use("/api/v1", routes);

// Error handler (must be last)
app.use(errorHandler);

export { app };
