import express from "express";
import cors from "cors";
import morgan from "morgan";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";

export function createApp() {
  const app = express();
  app.use(morgan("dev"));

  const isDev = (process.env.NODE_ENV || "development") !== "production";

  const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\/+$/, ""));

  const corsOptions = {
    origin: (origin, callback) => {
      // In local dev, let Vite/localhost work without friction.
      if (isDev) return callback(null, true);

      const normalized = String(origin || "").replace(/\/+$/, "");
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }

      // Do not throw (would become 500). Just reject the origin.
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));

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

  console.log("CORS allowed origins:", allowedOrigins.length === 0 ? "all (*)" : allowedOrigins.join(", "));

  return app;
}