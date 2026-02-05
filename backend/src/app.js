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
      origin: true,
      credentials: true,
    }),
  );
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
