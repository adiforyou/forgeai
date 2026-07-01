import { Router } from 'express';
import { handleGitHubWebhook } from '../controllers/webhooks/github';

const router = Router();

// GitHub webhook
router.post('/github', handleGitHubWebhook);

// GitLab webhook
router.post('/gitlab', async (req, res) => {
  // TODO: Implement GitLab webhook handler
  res.json({ message: 'Webhook received' });
});

// Bitbucket webhook
router.post('/bitbucket', async (req, res) => {
  // TODO: Implement Bitbucket webhook handler
  res.json({ message: 'Webhook received' });
});

export default router;
