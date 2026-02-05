import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';

export function createApp() {
  const app = express();

  app.use(morgan('dev'));

  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\/+$/, ''));

  const corsOptions = {
    origin: (origin, callback) => {
      // Allow non-browser clients (no Origin header)
      if (!origin) return callback(null, true);
      const normalized = String(origin).replace(/\/+$/, '');
      if (allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(normalized)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  app.use(cors(corsOptions));
  // Ensure preflight requests always get CORS headers.
  app.options('*', cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (req, res) => {
    res.json({
      name: 'MenteClara Backend',
      status: 'ok',
      docs: 'Use /api/health',
    });
  });

  app.use('/api', apiRoutes);

  app.use(errorHandler);
  return app;
}
