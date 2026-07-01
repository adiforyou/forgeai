-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('GITHUB', 'GITLAB', 'BITBUCKET');

-- CreateEnum
CREATE TYPE "PRStatus" AS ENUM ('PENDING', 'QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('REVIEW_PR', 'WEBHOOK_PROCESS', 'ANALYTICS_COMPUTE', 'CLEANUP');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "openaiApiKey" TEXT,
    "anthropicApiKey" TEXT,
    "geminiApiKey" TEXT,
    "customLlmConfig" JSONB,
    "githubToken" TEXT,
    "gitlabToken" TEXT,
    "bitbucketToken" TEXT,
    "bitbucketUser" TEXT,
    "defaultModel" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
    "fallbackModels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "autoReview" BOOLEAN NOT NULL DEFAULT true,
    "reviewOnDraft" BOOLEAN NOT NULL DEFAULT false,
    "maxCostPerReview" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "enableStreaming" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "slackWebhook" TEXT,
    "notifyOnComplete" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnFailure" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repositories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "repoFullName" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "repoId" TEXT,
    "webhookId" TEXT,
    "webhookSecret" TEXT,
    "webhookActive" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reviewRules" JSONB,
    "excludePatterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "blockOnFailure" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pull_requests" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "prTitle" TEXT NOT NULL,
    "prUrl" TEXT NOT NULL,
    "prAuthor" TEXT NOT NULL,
    "prAuthorId" TEXT,
    "prBranch" TEXT NOT NULL,
    "targetBranch" TEXT NOT NULL DEFAULT 'main',
    "diffSize" INTEGER,
    "filesChanged" INTEGER,
    "additions" INTEGER,
    "deletions" INTEGER,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "isMerged" BOOLEAN NOT NULL DEFAULT false,
    "mergedAt" TIMESTAMP(3),
    "status" "PRStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pull_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "strategy" TEXT NOT NULL DEFAULT 'single-pass',
    "systemPrompt" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "summary" TEXT,
    "findings" JSONB,
    "severity" "Severity",
    "costUsd" DOUBLE PRECISION,
    "tokensInput" INTEGER,
    "tokensOutput" INTEGER,
    "tokensTotal" INTEGER,
    "commentIds" TEXT[],
    "commentUrls" TEXT[],
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "reviewsCompleted" INTEGER NOT NULL DEFAULT 0,
    "reviewsFailed" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "avgCostPerPR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgReviewTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minReviewTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxReviewTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "issuesFound" INTEGER NOT NULL DEFAULT 0,
    "criticalCount" INTEGER NOT NULL DEFAULT 0,
    "highCount" INTEGER NOT NULL DEFAULT 0,
    "mediumCount" INTEGER NOT NULL DEFAULT 0,
    "lowCount" INTEGER NOT NULL DEFAULT 0,
    "modelUsage" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "errorMessage" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "timeout" INTEGER NOT NULL DEFAULT 300000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- CreateIndex
CREATE INDEX "repositories_userId_idx" ON "repositories"("userId");

-- CreateIndex
CREATE INDEX "repositories_platform_idx" ON "repositories"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_platform_repoFullName_key" ON "repositories"("platform", "repoFullName");

-- CreateIndex
CREATE INDEX "pull_requests_status_idx" ON "pull_requests"("status");

-- CreateIndex
CREATE INDEX "pull_requests_createdAt_idx" ON "pull_requests"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "pull_requests_repositoryId_prNumber_key" ON "pull_requests"("repositoryId", "prNumber");

-- CreateIndex
CREATE INDEX "reviews_pullRequestId_idx" ON "reviews"("pullRequestId");

-- CreateIndex
CREATE INDEX "reviews_userId_idx" ON "reviews"("userId");

-- CreateIndex
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

-- CreateIndex
CREATE INDEX "reviews_createdAt_idx" ON "reviews"("createdAt");

-- CreateIndex
CREATE INDEX "analytics_userId_date_idx" ON "analytics"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_userId_date_key" ON "analytics"("userId", "date");

-- CreateIndex
CREATE INDEX "jobs_status_priority_idx" ON "jobs"("status", "priority");

-- CreateIndex
CREATE INDEX "jobs_type_status_idx" ON "jobs"("type", "status");

-- CreateIndex
CREATE INDEX "jobs_scheduledFor_idx" ON "jobs"("scheduledFor");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
