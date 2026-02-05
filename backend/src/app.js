import express from "express";
import cors from "cors";
import morgan from "morgan";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";

export function createApp() {
  const app = express();

  app.use(morgan("dev"));

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        const allowedOrigins = (process.env.CORS_ORIGIN || "")
          .split(",")
          .map((o) => o.trim().replace(/\/+$/, ""));

        const normalized = origin.replace(/\/+$/, "");

        if (allowedOrigins.includes(normalized)) {
          return callback(null, true);
        }

        console.error("CORS bloqueado para:", origin);
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // Preflight (OPTIONS)
  app.options("*", cors());

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
