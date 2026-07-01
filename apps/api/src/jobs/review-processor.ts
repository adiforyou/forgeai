import { Job } from 'bullmq';
import { ReviewEngine } from '../services/review-engine';
import { logger } from '../utils/logger';

interface ReviewJobData {
  userId: string;
  platform: 'github';
  owner: string;
  repo: string;
  prNumber?: number;
  commitSha?: string;
  strategy?: 'single-pass' | 'multi-pass' | 'security-audit';
}

export async function processReviewJob(job: Job<ReviewJobData>) {
  const { userId, platform, owner, repo, prNumber, commitSha, strategy = 'single-pass' } = job.data;

  if (prNumber) {
    logger.info(`Processing PR review job ${job.id}: ${platform} ${owner}/${repo}#${prNumber}`);
  } else if (commitSha) {
    logger.info(`Processing commit review job ${job.id}: ${platform} ${owner}/${repo}@${commitSha}`);
  }

  try {
    const engine = new ReviewEngine();

    let result;
    if (prNumber) {
      result = await engine.reviewPR(
        userId,
        platform,
        owner,
        repo,
        prNumber,
        strategy
      );
    } else if (commitSha) {
      result = await engine.reviewCommit(
        userId,
        platform,
        owner,
        repo,
        commitSha,
        strategy
      );
    } else {
      throw new Error('Either prNumber or commitSha must be provided');
    }

    logger.info(`Review completed: ${result.reviewId}`);

    return {
      success: true,
      reviewId: result.reviewId,
      findings: result.result?.totalIssues || 0,
    };
  } catch (error) {
    logger.error(`Review job ${job.id} failed:`, error);
    throw error;
  }
}
