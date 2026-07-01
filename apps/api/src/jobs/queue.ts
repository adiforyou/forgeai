import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Review queue
export const reviewQueue = new Queue('review', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 200,
      age: 7 * 24 * 3600,
    },
  },
});

// Job processor (imported to avoid circular dependency)
export function createReviewWorker(processor: (job: Job) => Promise<any>) {
  return new Worker('review', processor, {
    connection,
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5'),
  });
}

// Monitor queue events
reviewQueue.on('error', (error) => {
  logger.error('Review queue error:', error);
});

logger.info('Review queue initialized');
