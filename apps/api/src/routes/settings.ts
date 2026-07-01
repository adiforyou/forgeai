import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@prr/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/crypto';
import { AppError } from '../middleware/error-handler';

const router = Router();
router.use(authenticate);

// Validation schema
const settingsSchema = z.object({
  // LLM API Keys
  openaiApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  geminiApiKey: z.string().optional(),

  // Git Tokens
  githubToken: z.string().optional(),
  gitlabToken: z.string().optional(),
  bitbucketToken: z.string().optional(),
  bitbucketUser: z.string().optional(),

  // Preferences
  defaultModel: z.string().optional(),
  fallbackModels: z.array(z.string()).optional(),
  autoReview: z.boolean().optional(),
  reviewOnDraft: z.boolean().optional(),
  maxCostPerReview: z.number().positive().optional(),
  enableStreaming: z.boolean().optional(),

  // Notifications
  emailNotifications: z.boolean().optional(),
  slackWebhook: z.string().url().optional().nullable(),
  notifyOnComplete: z.boolean().optional(),
  notifyOnFailure: z.boolean().optional(),
});

// Get user settings
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    let settings = await prisma.userSettings.findUnique({
      where: { userId: req.userId },
    });

    if (!settings) {
      // Create default settings
      settings = await prisma.userSettings.create({
        data: { userId: req.userId! },
      });
    }

    // Return settings without decrypting API keys (for security)
    res.json({
      settings: {
        ...settings,
        // Mask API keys
        openaiApiKey: settings.openaiApiKey ? '***' : null,
        anthropicApiKey: settings.anthropicApiKey ? '***' : null,
        geminiApiKey: settings.geminiApiKey ? '***' : null,
        githubToken: settings.githubToken ? '***' : null,
        gitlabToken: settings.gitlabToken ? '***' : null,
        bitbucketToken: settings.bitbucketToken ? '***' : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update user settings
router.put('/', async (req: AuthRequest, res, next) => {
  try {
    const data = settingsSchema.parse(req.body);

    // Encrypt sensitive fields
    const encrypted: any = {};
    if (data.openaiApiKey) encrypted.openaiApiKey = encrypt(data.openaiApiKey);
    if (data.anthropicApiKey) encrypted.anthropicApiKey = encrypt(data.anthropicApiKey);
    if (data.geminiApiKey) encrypted.geminiApiKey = encrypt(data.geminiApiKey);
    if (data.githubToken) encrypted.githubToken = encrypt(data.githubToken);
    if (data.gitlabToken) encrypted.gitlabToken = encrypt(data.gitlabToken);
    if (data.bitbucketToken) encrypted.bitbucketToken = encrypt(data.bitbucketToken);

    // Remove sensitive fields from data object (they're already encrypted)
    const {
      openaiApiKey,
      anthropicApiKey,
      geminiApiKey,
      githubToken,
      gitlabToken,
      bitbucketToken,
      ...nonSensitiveData
    } = data;

    const settings = await prisma.userSettings.upsert({
      where: { userId: req.userId },
      create: {
        userId: req.userId!,
        ...encrypted,
        ...nonSensitiveData,
      },
      update: {
        ...encrypted,
        ...nonSensitiveData,
      },
    });

    res.json({
      message: 'Settings updated successfully',
      settings: {
        ...settings,
        // Mask API keys
        openaiApiKey: settings.openaiApiKey ? '***' : null,
        anthropicApiKey: settings.anthropicApiKey ? '***' : null,
        geminiApiKey: settings.geminiApiKey ? '***' : null,
        githubToken: settings.githubToken ? '***' : null,
        gitlabToken: settings.gitlabToken ? '***' : null,
        bitbucketToken: settings.bitbucketToken ? '***' : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Test API key
router.post('/test-key', async (req: AuthRequest, res, next) => {
  try {
    const { provider } = z.object({ provider: z.enum(['openai', 'anthropic', 'gemini', 'github', 'gitlab', 'bitbucket']) }).parse(req.body);

    const settings = await prisma.userSettings.findUnique({
      where: { userId: req.userId },
    });

    if (!settings) {
      throw new AppError('Settings not found', 404);
    }

    // TODO: Implement actual API key testing
    // For now, just check if key exists

    let hasKey = false;
    switch (provider) {
      case 'openai':
        hasKey = !!settings.openaiApiKey;
        break;
      case 'anthropic':
        hasKey = !!settings.anthropicApiKey;
        break;
      case 'gemini':
        hasKey = !!settings.geminiApiKey;
        break;
      case 'github':
        hasKey = !!settings.githubToken;
        break;
      case 'gitlab':
        hasKey = !!settings.gitlabToken;
        break;
      case 'bitbucket':
        hasKey = !!settings.bitbucketToken;
        break;
    }

    res.json({
      provider,
      valid: hasKey,
      message: hasKey ? 'API key configured' : 'API key not configured',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
