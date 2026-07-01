import { Router } from 'express';
import { prisma } from 'database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { reviewQueue } from '../jobs/queue';
import { reviewLimiter } from '../middleware/rate-limit';

const router = Router();
router.use(authenticate);

// List reviews
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { status, severity, model, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      userId: req.userId,
    };

    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (model) where.model = model;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          pullRequest: {
            select: {
              prNumber: true,
              prTitle: true,
              repository: {
                select: {
                  repoFullName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.review.count({ where }),
    ]);

    res.json({
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get review details
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const review = await prisma.review.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        pullRequest: {
          include: {
            repository: true,
          },
        },
      },
    });

    if (!review) {
      throw new AppError('Review not found', 404);
    }

    res.json({ review });
  } catch (error) {
    next(error);
  }
});

// Delete review
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const review = await prisma.review.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!review) {
      throw new AppError('Review not found', 404);
    }

    await prisma.review.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
});

// Rerun review
router.post('/:id/rerun', async (req: AuthRequest, res, next) => {
  try {
    const review = await prisma.review.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        pullRequest: {
          include: {
            repository: true,
          },
        },
      },
    });

    if (!review) {
      throw new AppError('Review not found', 404);
    }

    const [owner, repo] = review.pullRequest.repository.repoFullName.split('/');

    // Queue new review job
    const job = await reviewQueue.add('review-pr', {
      userId: req.userId!,
      platform: review.pullRequest.repository.platform.toLowerCase() as 'github',
      owner,
      repo,
      prNumber: review.pullRequest.prNumber,
      strategy: review.strategy as any,
    });

    res.json({
      message: 'Review re-queued',
      jobId: job.id,
    });
  } catch (error) {
    next(error);
  }
});

// Manual review trigger (for testing)
router.post('/manual', reviewLimiter, async (req: AuthRequest, res, next) => {
  try {
    const { platform, owner, repo, prNumber, commitSha, strategy = 'single-pass' } = req.body;

    if (!platform || !owner || !repo) {
      throw new AppError('Missing required fields: platform, owner, repo', 400);
    }

    // Validate that either prNumber or commitSha is provided
    if (!prNumber && !commitSha) {
      throw new AppError('Either prNumber or commitSha is required', 400);
    }

    if (prNumber && commitSha) {
      throw new AppError('Provide either prNumber or commitSha, not both', 400);
    }

    // Queue review job
    const jobType = prNumber ? 'review-pr' : 'review-commit';
    const jobData: any = {
      userId: req.userId!,
      platform,
      owner,
      repo,
      strategy,
    };

    if (prNumber) {
      jobData.prNumber = prNumber;
    } else {
      jobData.commitSha = commitSha;
    }

    const job = await reviewQueue.add(jobType, jobData);

    res.json({
      message: prNumber ? 'PR review queued' : 'Commit review queued',
      jobId: job.id,
      reviewType: prNumber ? 'pull-request' : 'commit',
      estimatedTime: strategy === 'single-pass' ? '30-60 seconds' : '2-3 minutes',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
