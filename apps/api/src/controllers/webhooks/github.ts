import { Request, Response } from 'express';
import { GitHubProvider } from 'git-providers';
import { prisma } from 'database';
import { logger } from '../../utils/logger';
import { reviewQueue } from '../../jobs/queue';

export async function handleGitHubWebhook(req: Request, res: Response) {
  try {
    const event = req.headers['x-github-event'] as string;
    const signature = req.headers['x-hub-signature-256'] as string;
    const payload = req.body;

    logger.info(`Received GitHub webhook: ${event}`);

    // Verify webhook signature
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const provider = new GitHubProvider('');
      const isValid = provider.verifyWebhookSignature(
        JSON.stringify(payload),
        signature,
        webhookSecret
      );

      if (!isValid) {
        logger.warn('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Handle pull request events
    if (event === 'pull_request') {
      const action = payload.action;
      const pr = payload.pull_request;
      const repository = payload.repository;

      logger.info(`PR ${action}: ${repository.full_name}#${pr.number}`);

      // Find repository in database
      const dbRepo = await prisma.repository.findFirst({
        where: {
          platform: 'GITHUB',
          repoFullName: repository.full_name,
          isActive: true,
        },
        include: {
          user: {
            include: {
              settings: true,
            },
          },
        },
      });

      if (!dbRepo) {
        logger.info(`Repository ${repository.full_name} not found or inactive`);
        return res.json({ message: 'Repository not configured' });
      }

      const settings = dbRepo.user.settings;
      if (!settings) {
        logger.error(`User ${dbRepo.userId} has no settings`);
        return res.json({ message: 'User settings not found' });
      }

      // Check if auto-review is enabled
      if (!settings.autoReview) {
        logger.info('Auto-review is disabled for this repository');
        return res.json({ message: 'Auto-review disabled' });
      }

      // Check if we should review draft PRs
      if (pr.draft && !settings.reviewOnDraft) {
        logger.info('Skipping draft PR');
        return res.json({ message: 'Draft PRs not configured for review' });
      }

      // Handle specific actions
      if (['opened', 'reopened', 'synchronize'].includes(action)) {
        // Queue review job
        const [owner, repo] = repository.full_name.split('/');

        const job = await reviewQueue.add('review-pr', {
          userId: dbRepo.userId,
          platform: 'github',
          owner,
          repo,
          prNumber: pr.number,
          strategy: 'single-pass',
        });

        logger.info(`Queued review job: ${job.id}`);

        return res.json({
          message: 'Review queued',
          jobId: job.id,
        });
      }
    }

    // Handle pull request review events
    if (event === 'pull_request_review') {
      // TODO: Handle review comments
      logger.info('Pull request review event received');
    }

    res.json({ message: 'Webhook processed' });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
