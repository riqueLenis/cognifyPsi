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

  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin.replace(/\/+$/, ""))) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
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

  console.log("CORS allowed origins:", allowedOrigins.length === 0 ? "all (*)" : allowedOrigins.join(", "));

  return app;
}