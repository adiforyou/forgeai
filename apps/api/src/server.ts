import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { rateLimiter } from './middleware/rate-limiter';

// Import routes
import authRoutes from './routes/auth';
import settingsRoutes from './routes/settings';
import repositoriesRoutes from './routes/repositories';
import pullRequestsRoutes from './routes/pull-requests';
import reviewsRoutes from './routes/reviews';
import webhooksRoutes from './routes/webhooks';
import analyticsRoutes from './routes/analytics';
import healthRoutes from './routes/health';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());

// CORS Configuration with proper validation
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Rate limiting
app.use('/api/', rateLimiter);

// Health check (no auth required)
app.use('/api/health', healthRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/repositories', repositoriesRoutes);
app.use('/api/pull-requests', pullRequestsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 8080;

httpServer.listen(PORT, () => {
  logger.info(`🚀 Forge AI API running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
