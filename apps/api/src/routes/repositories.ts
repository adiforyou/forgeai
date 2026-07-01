import { Router } from 'express';
import { z } from 'zod';
import { prisma } from 'database';
import { GitHubProvider, GitLabProvider, BitbucketProvider } from 'git-providers';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { decrypt } from '../utils/crypto';
import { repoFetchLimiter } from '../middleware/rate-limit';

const router = Router();
router.use(authenticate);

const addRepoSchema = z.object({
  platform: z.enum(['github', 'gitlab', 'bitbucket']),
  repoFullName: z.string().regex(/^[\w-]+\/[\w-]+$/),
  autoSetupWebhook: z.boolean().optional().default(false),
});

// List repositories
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { platform, isActive } = req.query;

    const where: any = { userId: req.userId };
    if (platform) where.platform = (platform as string).toUpperCase();
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const repositories = await prisma.repository.findMany({
      where,
      include: {
        _count: {
          select: { pullRequests: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      repositories: repositories.map((r) => ({
        ...r,
        platform: r.platform.toLowerCase(),
        pullRequestCount: r._count.pullRequests,
      })),
      total: repositories.length,
    });
  } catch (error) {
    next(error);
  }
});

// Add repository
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = addRepoSchema.parse(req.body);

    // Check if already exists
    const existing = await prisma.repository.findFirst({
      where: {
        userId: req.userId,
        platform: data.platform.toUpperCase() as any,
        repoFullName: data.repoFullName,
      },
    });

    if (existing) {
      throw new AppError('Repository already connected', 400);
    }

    // Create repository
    const repository = await prisma.repository.create({
      data: {
        userId: req.userId!,
        platform: data.platform.toUpperCase() as any,
        repoFullName: data.repoFullName,
        repoUrl: `https://github.com/${data.repoFullName}`,
        isActive: true,
      },
    });

    // Setup webhook if requested
    let webhook = null;
    if (data.autoSetupWebhook && data.platform === 'github') {
      try {
        const settings = await prisma.userSettings.findUnique({
          where: { userId: req.userId },
        });

        if (settings?.githubToken) {
          const github = new GitHubProvider(decrypt(settings.githubToken));
          const [owner, repo] = data.repoFullName.split('/');

          // Note: This would need GitHub API implementation for webhook creation
          // For now, just return instructions
          webhook = {
            message: 'Manual webhook setup required',
            url: `${process.env.WEBHOOK_BASE_URL || 'http://localhost:8080'}/api/webhooks/github`,
          };
        }
      } catch (error) {
        console.error('Webhook setup failed:', error);
      }
    }

    res.status(201).json({
      repository,
      webhook,
    });
  } catch (error) {
    next(error);
  }
});

// Fetch user's GitHub repositories
router.get('/fetch-github', repoFetchLimiter, async (req: AuthRequest, res, next) => {
  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: req.userId! },
    });

    if (!settings?.githubToken) {
      throw new AppError('GitHub token not configured. Please add it in Settings.', 400);
    }

    let githubToken: string;
    try {
      githubToken = decrypt(settings.githubToken);
    } catch (decryptError) {
      throw new AppError('Failed to decrypt GitHub token. Please re-save your token in Settings.', 400);
    }

    if (!githubToken || githubToken.trim() === '') {
      throw new AppError('GitHub token is empty after decryption. Please re-save your token in Settings.', 400);
    }

    const github = new GitHubProvider(githubToken);
    const repos = await github.listUserRepositories();

    res.json({
      repositories: repos,
      total: repos.length,
    });
  } catch (error: any) {
    if (error.status === 401) {
      next(new AppError('GitHub token is invalid or expired. Please update it in Settings.', 401));
    } else if (error.message && typeof error.message === 'string' && error.message.includes('authentication')) {
      next(new AppError('GitHub authentication failed. Please check your token in Settings.', 401));
    } else {
      next(error);
    }
  }
});

// Fetch user's GitLab repositories
router.get('/fetch-gitlab', repoFetchLimiter, async (req: AuthRequest, res, next) => {
  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: req.userId! },
    });

    if (!settings?.gitlabToken) {
      throw new AppError('GitLab token not configured. Please add it in Settings.', 400);
    }

    let gitlabToken: string;
    try {
      gitlabToken = decrypt(settings.gitlabToken);
    } catch (decryptError) {
      throw new AppError('Failed to decrypt GitLab token. Please re-save your token in Settings.', 400);
    }

    if (!gitlabToken || gitlabToken.trim() === '') {
      throw new AppError('GitLab token is empty after decryption. Please re-save your token in Settings.', 400);
    }

    const gitlab = new GitLabProvider(gitlabToken);
    const repos = await gitlab.listUserRepositories();

    res.json({
      repositories: repos,
      total: repos.length,
    });
  } catch (error: any) {
    if (error.status === 401) {
      next(new AppError('GitLab token is invalid or expired. Please update it in Settings.', 401));
    } else if (error.message && typeof error.message === 'string' && error.message.includes('authentication')) {
      next(new AppError('GitLab authentication failed. Please check your token in Settings.', 401));
    } else {
      next(error);
    }
  }
});

// Fetch user's Bitbucket repositories
router.get('/fetch-bitbucket', repoFetchLimiter, async (req: AuthRequest, res, next) => {
  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: req.userId! },
    });

    if (!settings?.bitbucketToken || !settings?.bitbucketUser) {
      throw new AppError('Bitbucket token and username not configured. Please add them in Settings.', 400);
    }

    let bitbucketToken: string;
    try {
      bitbucketToken = decrypt(settings.bitbucketToken);
    } catch (decryptError) {
      throw new AppError('Failed to decrypt Bitbucket token. Please re-save your token in Settings.', 400);
    }

    if (!bitbucketToken || bitbucketToken.trim() === '') {
      throw new AppError('Bitbucket token is empty after decryption. Please re-save your token in Settings.', 400);
    }

    const bitbucket = new BitbucketProvider(bitbucketToken, settings.bitbucketUser);
    const repos = await bitbucket.listUserRepositories();

    res.json({
      repositories: repos,
      total: repos.length,
    });
  } catch (error: any) {
    if (error.status === 401) {
      next(new AppError('Bitbucket token is invalid or expired. Please update it in Settings.', 401));
    } else if (error.message && typeof error.message === 'string' && error.message.includes('authentication')) {
      next(new AppError('Bitbucket authentication failed. Please check your token in Settings.', 401));
    } else {
      next(error);
    }
  }
});

// Get repository
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const repository = await prisma.repository.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        pullRequests: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            reviews: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!repository) {
      throw new AppError('Repository not found', 404);
    }

    res.json({ repository });
  } catch (error) {
    next(error);
  }
});

// Update repository
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const updateSchema = z.object({
      isActive: z.boolean().optional(),
      requireApproval: z.boolean().optional(),
      blockOnFailure: z.boolean().optional(),
    });

    const data = updateSchema.parse(req.body);

    const repository = await prisma.repository.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!repository) {
      throw new AppError('Repository not found', 404);
    }

    const updated = await prisma.repository.update({
      where: { id: req.params.id },
      data,
    });

    res.json({
      message: 'Repository updated',
      repository: updated,
    });
  } catch (error) {
    next(error);
  }
});

// Delete repository
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const repository = await prisma.repository.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!repository) {
      throw new AppError('Repository not found', 404);
    }

    await prisma.repository.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Repository deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Sync repository
router.post('/:id/sync', async (req: AuthRequest, res, next) => {
  try {
    const repository = await prisma.repository.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!repository) {
      throw new AppError('Repository not found', 404);
    }

    // Get user's Git token
    const settings = await prisma.userSettings.findUnique({
      where: { userId: req.userId },
    });

    if (!settings?.githubToken) {
      throw new AppError('GitHub token not configured', 400);
    }

    const github = new GitHubProvider(decrypt(settings.githubToken));
    const [owner, repo] = repository.repoFullName.split('/');

    // This would fetch open PRs from GitHub
    // For now, return placeholder
    res.json({
      message: 'Sync functionality coming soon',
      synced: 0,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
