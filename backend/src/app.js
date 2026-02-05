import express from "express";
import cors from "cors";
import morgan from "morgan";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";

export function createApp() {
  const app = express();
  app.use(morgan("dev"));

  const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\/+$/, ""));

  const normalizeOrigin = (origin) => String(origin || "").replace(/\/+$/, "");
  const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    if (allowedOrigins.length === 0) return true;
    return allowedOrigins.includes(normalizeOrigin(origin));
  };

  // Explicit preflight handler (prevents 405 on OPTIONS)
  app.use((req, res, next) => {
    if (req.method !== "OPTIONS") return next();

    const origin = req.headers.origin;
    if (origin && isAllowedOrigin(origin)) {
      res.header("Access-Control-Allow-Origin", normalizeOrigin(origin));
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] ||
        "Content-Type,Authorization",
    );

    return res.sendStatus(204);
  });

  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      return callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };

  app.use(cors(corsOptions));

  app.use(express.json({ limit: "1mb" }));

  app.get("/", (req, res) => {
    res.json({
      name: "MenteClara Backend",
      status: "ok",
      docs: "Use /api/health",
    });
  });

  app.use("/api", apiRoutes);

  app.use(errorHandler);
  return app;
}
