import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@prr/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { reviewQueue } from '../jobs/queue';

const router = Router();
router.use(authenticate);

// List pull requests
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { repositoryId, status, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      repository: {
        userId: req.userId,
      },
    };

    if (repositoryId) where.repositoryId = repositoryId;
    if (status) where.status = status;

    const [pullRequests, total] = await Promise.all([
      prisma.pullRequest.findMany({
        where,
        include: {
          repository: {
            select: {
              repoFullName: true,
              platform: true,
            },
          },
          reviews: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              status: true,
              severity: true,
              costUsd: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.pullRequest.count({ where }),
    ]);

    res.json({
      pullRequests,
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

// Get pull request details
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const pullRequest = await prisma.pullRequest.findFirst({
      where: {
        id: req.params.id,
        repository: {
          userId: req.userId,
        },
      },
      include: {
        repository: true,
        reviews: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!pullRequest) {
      throw new AppError('Pull request not found', 404);
    }

    res.json({ pullRequest });
  } catch (error) {
    next(error);
  }
});

// Trigger manual review
router.post('/:id/review', async (req: AuthRequest, res, next) => {
  try {
    const reviewSchema = z.object({
      strategy: z.enum(['single-pass', 'multi-pass', 'security-audit']).optional(),
    });

    const { strategy = 'single-pass' } = reviewSchema.parse(req.body);

    const pullRequest = await prisma.pullRequest.findFirst({
      where: {
        id: req.params.id,
        repository: {
          userId: req.userId,
        },
      },
      include: {
        repository: true,
      },
    });

    if (!pullRequest) {
      throw new AppError('Pull request not found', 404);
    }

    const [owner, repo] = pullRequest.repository.repoFullName.split('/');

    // Queue review job
    const job = await reviewQueue.add('review-pr', {
      userId: req.userId!,
      platform: pullRequest.repository.platform.toLowerCase() as 'github',
      owner,
      repo,
      prNumber: pullRequest.prNumber,
      strategy,
    });

    res.json({
      message: 'Review queued',
      jobId: job.id,
      estimatedTime: strategy === 'single-pass' ? '30-60 seconds' : '2-3 minutes',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
