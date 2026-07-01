import 'dotenv/config';
import { createReviewWorker } from './jobs/queue';
import { processReviewJob } from './jobs/review-processor';
import { logger } from './utils/logger';

logger.info('Starting background worker...');

const worker = createReviewWorker(processReviewJob);

worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
  logger.error('Worker error:', err);
});

logger.info(`Worker started with concurrency ${process.env.QUEUE_CONCURRENCY || 5}`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing worker...');
  await worker.close();
  process.exit(0);
});
