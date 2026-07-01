import { Router } from 'express';
import { prisma } from '@prr/database';
import Redis from 'ioredis';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis connection
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await redis.ping();
    redis.disconnect();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: 'connected',
        redis: 'connected',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
