import { Router } from 'express';
import { prisma } from 'database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Dashboard stats
router.get('/dashboard', async (req: AuthRequest, res, next) => {
  try {
    const { period = 'month' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get all reviews in period
    const reviews = await prisma.review.findMany({
      where: {
        userId: req.userId,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        status: true,
        severity: true,
        model: true,
        costUsd: true,
        tokensTotal: true,
        duration: true,
        findings: true,
      },
    });

    // Filter only completed reviews for accurate stats
    const completedReviews = reviews.filter(r => r.status === 'COMPLETED');

    // Calculate stats (only from completed reviews)
    const totalReviews = reviews.length;
    const completedCount = completedReviews.length;
    const failedCount = reviews.filter(r => r.status === 'FAILED').length;
    const totalCost = completedReviews.reduce((sum, r) => sum + (r.costUsd || 0), 0);
    const totalTokens = completedReviews.reduce((sum, r) => sum + (r.tokensTotal || 0), 0);
    const avgReviewTime = completedReviews.length > 0
      ? completedReviews.reduce((sum, r) => sum + (r.duration || 0), 0) / completedReviews.length / 1000
      : 0;
    const avgCostPerReview = completedCount > 0 ? totalCost / completedCount : 0;

    // Count issues by severity
    const issuesFound = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    completedReviews.forEach((review) => {
      if (review.findings && typeof review.findings === 'object') {
        const findings = review.findings as any;
        if (Array.isArray(findings.findings)) {
          findings.findings.forEach((f: any) => {
            if (f.severity in issuesFound) {
              issuesFound[f.severity as keyof typeof issuesFound]++;
            }
          });
        }
      }
    });

    // Count by model (only completed reviews)
    const byModel: Record<string, { count: number; cost: number }> = {};
    completedReviews.forEach((review) => {
      if (!byModel[review.model]) {
        byModel[review.model] = { count: 0, cost: 0 };
      }
      byModel[review.model].count++;
      byModel[review.model].cost += review.costUsd || 0;
    });

    // Estimate time saved (assume 2 hours per completed review)
    const totalTimeSaved = completedCount * 2;

    res.json({
      stats: {
        totalReviews,
        completedReviews: completedCount,
        failedReviews: failedCount,
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalTokens,
        totalTimeSaved,
        avgReviewTime: parseFloat(avgReviewTime.toFixed(1)),
        avgCostPerReview: parseFloat(avgCostPerReview.toFixed(4)),
        issuesFound,
        byModel,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Cost analytics
router.get('/costs', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    let start = startDate ? new Date(startDate as string) : new Date();
    let end = endDate ? new Date(endDate as string) : new Date();

    if (!startDate) {
      start.setDate(start.getDate() - 30); // Default last 30 days
    }

    const reviews = await prisma.review.findMany({
      where: {
        userId: req.userId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        costUsd: true,
        model: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by date
    const grouped: Record<string, { totalCost: number; reviewCount: number; byModel: Record<string, number> }> = {};

    reviews.forEach((review) => {
      const date = review.createdAt.toISOString().split('T')[0];

      if (!grouped[date]) {
        grouped[date] = {
          totalCost: 0,
          reviewCount: 0,
          byModel: {},
        };
      }

      grouped[date].totalCost += review.costUsd || 0;
      grouped[date].reviewCount++;

      if (!grouped[date].byModel[review.model]) {
        grouped[date].byModel[review.model] = 0;
      }
      grouped[date].byModel[review.model] += review.costUsd || 0;
    });

    // Convert to array
    const costs = Object.entries(grouped).map(([date, data]) => ({
      date,
      totalCost: parseFloat(data.totalCost.toFixed(2)),
      reviewCount: data.reviewCount,
      avgCost: parseFloat((data.totalCost / data.reviewCount).toFixed(4)),
      byModel: data.byModel,
    }));

    // Calculate summary
    const totalCost = reviews.reduce((sum, r) => sum + (r.costUsd || 0), 0);
    const totalReviews = reviews.length;

    res.json({
      costs,
      summary: {
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalReviews,
        avgCostPerReview: totalReviews > 0 ? parseFloat((totalCost / totalReviews).toFixed(4)) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Trends analytics
router.get('/trends', async (req: AuthRequest, res, next) => {
  try {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const reviews = await prisma.review.findMany({
      where: {
        userId: req.userId,
        createdAt: {
          gte: last30Days,
        },
      },
      select: {
        createdAt: true,
        costUsd: true,
        findings: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by date
    const trends: Record<string, { count: number; cost: number; critical: number; high: number; medium: number }> = {};

    reviews.forEach((review) => {
      const date = review.createdAt.toISOString().split('T')[0];

      if (!trends[date]) {
        trends[date] = { count: 0, cost: 0, critical: 0, high: 0, medium: 0 };
      }

      trends[date].count++;
      trends[date].cost += review.costUsd || 0;

      // Count issues
      if (review.findings && typeof review.findings === 'object') {
        const findings = review.findings as any;
        if (Array.isArray(findings.findings)) {
          findings.findings.forEach((f: any) => {
            if (f.severity === 'critical') trends[date].critical++;
            if (f.severity === 'high') trends[date].high++;
            if (f.severity === 'medium') trends[date].medium++;
          });
        }
      }
    });

    // Convert to arrays
    const reviewTrend = Object.entries(trends).map(([date, data]) => ({
      date,
      count: data.count,
    }));

    const costTrend = Object.entries(trends).map(([date, data]) => ({
      date,
      cost: parseFloat(data.cost.toFixed(2)),
    }));

    const issueTrend = Object.entries(trends).map(([date, data]) => ({
      date,
      critical: data.critical,
      high: data.high,
      medium: data.medium,
    }));

    res.json({
      trends: {
        reviews: reviewTrend,
        costs: costTrend,
        issues: issueTrend,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
