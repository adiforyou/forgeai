import { LLMOrchestrator } from 'llm';
import { GitHubProvider } from 'git-providers';
import type { PRInfo, PRDiff, FileChange, ReviewResult, ReviewFinding, ReviewStrategy } from 'types';
import { prisma } from 'database';
import { decrypt } from '../utils/crypto';
import { logger } from '../utils/logger';

export class ReviewEngine {
  async reviewPR(
    userId: string,
    platform: 'github',
    owner: string,
    repo: string,
    prNumber: number,
    strategy: ReviewStrategy = 'single-pass'
  ): Promise<{ reviewId: string; result: ReviewResult }> {
    logger.info(`Starting review for ${platform} PR ${owner}/${repo}#${prNumber}`);

    // Get user settings
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      throw new Error('User settings not found');
    }

    // Get PR data
    const gitProvider = this.getGitProvider(platform, settings);
    const [prInfo, diff, files, commits] = await Promise.all([
      gitProvider.getPR(owner, repo, prNumber),
      gitProvider.getDiff(owner, repo, prNumber),
      gitProvider.getFiles(owner, repo, prNumber),
      gitProvider.getCommits(owner, repo, prNumber),
    ]);

    // Find or create PR record
    const repository = await prisma.repository.findFirst({
      where: {
        userId,
        platform: platform.toUpperCase() as any,
        repoFullName: `${owner}/${repo}`,
      },
    });

    if (!repository) {
      throw new Error('Repository not found');
    }

    const pullRequest = await prisma.pullRequest.upsert({
      where: {
        repositoryId_prNumber: {
          repositoryId: repository.id,
          prNumber,
        },
      },
      create: {
        repositoryId: repository.id,
        prNumber,
        prTitle: prInfo.title,
        prUrl: prInfo.url,
        prAuthor: prInfo.author,
        prBranch: prInfo.branch,
        targetBranch: prInfo.targetBranch,
        diffSize: diff.additions + diff.deletions,
        filesChanged: diff.filesChanged,
        additions: diff.additions,
        deletions: diff.deletions,
        status: 'IN_PROGRESS',
      },
      update: {
        status: 'IN_PROGRESS',
        lastSyncAt: new Date(),
      },
    });

    // Create review record
    const review = await prisma.review.create({
      data: {
        pullRequestId: pullRequest.id,
        userId,
        model: settings.defaultModel,
        strategy,
        systemPrompt: this.getSystemPrompt(),
        status: 'IN_PROGRESS',
      },
    });

    try {
      // Initialize LLM orchestrator
      const llm = new LLMOrchestrator({
        openaiApiKey: settings.openaiApiKey ? decrypt(settings.openaiApiKey) : undefined,
        anthropicApiKey: settings.anthropicApiKey ? decrypt(settings.anthropicApiKey) : undefined,
        geminiApiKey: settings.geminiApiKey ? decrypt(settings.geminiApiKey) : undefined,
        defaultModel: settings.defaultModel,
        fallbackModels: settings.fallbackModels,
      });

      // Generate user prompt
      const userPrompt = this.generateUserPrompt(prInfo, diff, files, commits);

      // Run review
      logger.info(`Running ${strategy} review with model ${settings.defaultModel}`);
      const llmResponse = await llm.reviewWithStrategy(
        strategy,
        this.getSystemPrompt(),
        userPrompt
      );

      // Parse findings
      const result = this.parseReviewResult(llmResponse.content);

      // Update review record
      await prisma.review.update({
        where: { id: review.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          duration: llmResponse.duration,
          summary: result.summary,
          findings: result as any,
          severity: this.determineSeverity(result),
          costUsd: llmResponse.costUsd,
          tokensInput: llmResponse.tokensUsed.input,
          tokensOutput: llmResponse.tokensUsed.output,
          tokensTotal: llmResponse.tokensUsed.total,
        },
      });

      // Update PR status
      await prisma.pullRequest.update({
        where: { id: pullRequest.id },
        data: { status: 'COMPLETED' },
      });

      // Post review comment
      const commentBody = this.formatReviewComment(result, llmResponse.costUsd, llmResponse.duration);
      const comment = await gitProvider.postComment(owner, repo, prNumber, commentBody);

      // Update review with comment ID
      await prisma.review.update({
        where: { id: review.id },
        data: {
          commentIds: [comment.id.toString()],
          commentUrls: [comment.url],
        },
      });

      // Set GitHub status check
      const latestCommit = commits[commits.length - 1];
      if (latestCommit) {
        const passed = result.criticalCount === 0 && result.highCount === 0;
        await gitProvider.setStatus(
          owner,
          repo,
          latestCommit.sha,
          passed ? 'success' : 'failure',
          'forge-ai',
          passed ? 'Review passed' : `Found ${result.criticalCount} critical, ${result.highCount} high priority issues`,
          comment.url
        );
      }

      logger.info(`Review completed: ${review.id}`);

      return { reviewId: review.id, result };
    } catch (error) {
      logger.error('Review failed:', error);

      // Update review as failed
      await prisma.review.update({
        where: { id: review.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      await prisma.pullRequest.update({
        where: { id: pullRequest.id },
        data: { status: 'FAILED' },
      });

      throw error;
    }
  }

  async reviewCommit(
    userId: string,
    platform: 'github',
    owner: string,
    repo: string,
    commitSha: string,
    strategy: ReviewStrategy = 'single-pass'
  ): Promise<{ reviewId: string; result: ReviewResult }> {
    logger.info(`Starting review for ${platform} commit ${owner}/${repo}@${commitSha}`);

    // Get user settings
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      throw new Error('User settings not found');
    }

    // Get commit data
    const gitProvider = this.getGitProvider(platform, settings);
    const commit = await gitProvider.getCommit(owner, repo, commitSha);
    const diff = await gitProvider.getCommitDiff(owner, repo, commitSha);

    // Find or create repository (optional for commit reviews)
    let repository = await prisma.repository.findFirst({
      where: {
        userId,
        platform: platform.toUpperCase() as any,
        repoFullName: `${owner}/${repo}`,
      },
    });

    // Create a review record (not tied to PR)
    const review = await prisma.review.create({
      data: {
        userId,
        model: settings.defaultModel,
        strategy,
        systemPrompt: this.getSystemPrompt(),
        status: 'IN_PROGRESS',
      },
    });

    try {
      // Initialize LLM orchestrator
      const llm = new LLMOrchestrator({
        openaiApiKey: settings.openaiApiKey ? decrypt(settings.openaiApiKey) : undefined,
        anthropicApiKey: settings.anthropicApiKey ? decrypt(settings.anthropicApiKey) : undefined,
        geminiApiKey: settings.geminiApiKey ? decrypt(settings.geminiApiKey) : undefined,
        defaultModel: settings.defaultModel,
        fallbackModels: settings.fallbackModels,
      });

      // Generate user prompt for commit
      const userPrompt = this.generateCommitPrompt(commit, diff);

      // Run review
      logger.info(`Running ${strategy} review with model ${settings.defaultModel}`);
      const llmResponse = await llm.reviewWithStrategy(
        strategy,
        this.getSystemPrompt(),
        userPrompt
      );

      // Parse findings
      const result = this.parseReviewResult(llmResponse.content);

      // Update review record
      await prisma.review.update({
        where: { id: review.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          duration: llmResponse.duration,
          summary: result.summary,
          findings: result as any,
          severity: this.determineSeverity(result),
          costUsd: llmResponse.costUsd,
          tokensInput: llmResponse.tokensUsed.input,
          tokensOutput: llmResponse.tokensUsed.output,
          tokensTotal: llmResponse.tokensUsed.total,
        },
      });

      // Post review comment on commit (optional - don't fail if this fails)
      const commentBody = this.formatCommitReviewComment(commit, result, llmResponse.costUsd, llmResponse.duration);
      let commentUrl: string | undefined;

      try {
        const comment = await gitProvider.postCommitComment(owner, repo, commitSha, commentBody);

        // Update review with comment ID
        await prisma.review.update({
          where: { id: review.id },
          data: {
            commentIds: [comment.id.toString()],
            commentUrls: [comment.url],
          },
        });

        commentUrl = comment.url;
        logger.info(`Posted commit comment: ${comment.url}`);
      } catch (commentError) {
        logger.warn(`Failed to post commit comment: ${commentError instanceof Error ? commentError.message : 'Unknown error'}`);
        // Continue anyway - the review is still valid
      }

      // Set GitHub status check (optional)
      try {
        const passed = result.criticalCount === 0 && result.highCount === 0;
        await gitProvider.setStatus(
          owner,
          repo,
          commitSha,
          passed ? 'success' : 'failure',
          'forge-ai',
          passed ? 'Review passed' : `Found ${result.criticalCount} critical, ${result.highCount} high priority issues`,
          commentUrl
        );
      } catch (statusError) {
        logger.warn(`Failed to set commit status: ${statusError instanceof Error ? statusError.message : 'Unknown error'}`);
        // Continue anyway
      }

      logger.info(`Commit review completed: ${review.id}`);

      return { reviewId: review.id, result };
    } catch (error) {
      logger.error('Commit review failed:', error);

      // Update review as failed
      await prisma.review.update({
        where: { id: review.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  private getGitProvider(platform: 'github', settings: any): GitHubProvider {
    if (platform === 'github') {
      if (!settings.githubToken) {
        throw new Error('GitHub token not configured');
      }
      return new GitHubProvider(decrypt(settings.githubToken));
    }
    throw new Error(`Unsupported platform: ${platform}`);
  }

  private getSystemPrompt(): string {
    return `You are an expert code reviewer. Your task is to analyze pull requests and provide constructive feedback.

Focus on:
1. **Security vulnerabilities**: SQL injection, XSS, authentication issues, data exposure
2. **Performance issues**: N+1 queries, memory leaks, inefficient algorithms, blocking operations
3. **Code quality**: Complexity, duplication, naming, structure, maintainability
4. **Best practices**: Design patterns, error handling, testing, documentation
5. **Architecture**: Separation of concerns, SOLID principles, scalability

For each issue you find, provide:
- **Severity**: critical | high | medium | low | info
- **Category**: security | performance | quality | style | architecture
- **Title**: Brief description (one line)
- **Description**: Detailed explanation of the issue
- **File and Line**: Where the issue is located (if applicable)
- **Suggestion**: How to fix it
- **Code Example**: Show the problematic code and the corrected version

Format your response as JSON:
{
  "summary": "Brief overview of the PR and main findings",
  "findings": [
    {
      "severity": "critical",
      "category": "security",
      "title": "SQL Injection vulnerability",
      "description": "User input is directly concatenated into SQL query",
      "file": "src/api/users.ts",
      "line": 42,
      "suggestion": "Use parameterized queries",
      "codeSnippet": "db.query(\`SELECT * FROM users WHERE id = \${req.params.id}\`)",
      "fixedCode": "db.query('SELECT * FROM users WHERE id = $1', [req.params.id])"
    }
  ]
}

Be specific, actionable, and constructive. Prioritize critical issues.`;
  }

  private generateUserPrompt(
    prInfo: PRInfo,
    diff: PRDiff,
    files: FileChange[],
    commits: any[]
  ): string {
    const fileList = files.map((f) => `  - [${f.status}] ${f.path} (+${f.additions}/-${f.deletions})`).join('\n');
    const commitList = commits.map((c) => `  - ${c.sha.substring(0, 7)} ${c.message}`).join('\n');

    return `# Pull Request Review

## PR Information
- **Title**: ${prInfo.title}
- **Author**: ${prInfo.author}
- **Branch**: ${prInfo.branch} → ${prInfo.targetBranch}
- **Description**: ${prInfo.description || 'No description provided'}

## Changes Summary
- **Files Changed**: ${diff.filesChanged}
- **Lines Added**: ${diff.additions}
- **Lines Deleted**: ${diff.deletions}

## Files Changed
${fileList}

## Commits
${commitList}

## Diff
\`\`\`diff
${diff.content.substring(0, 50000)}
\`\`\`

Please review this pull request and provide your findings in JSON format.`;
  }

  private parseReviewResult(llmContent: string): ReviewResult {
    try {
      // Try to extract JSON from markdown code block
      const jsonMatch = llmContent.match(/```json\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : llmContent;

      const parsed = JSON.parse(jsonStr);

      const findings: ReviewFinding[] = parsed.findings || [];

      return {
        summary: parsed.summary || 'No summary provided',
        findings,
        totalIssues: findings.length,
        criticalCount: findings.filter((f) => f.severity === 'critical').length,
        highCount: findings.filter((f) => f.severity === 'high').length,
        mediumCount: findings.filter((f) => f.severity === 'medium').length,
        lowCount: findings.filter((f) => f.severity === 'low').length,
        infoCount: findings.filter((f) => f.severity === 'info').length,
      };
    } catch (error) {
      logger.error('Failed to parse LLM response:', error);

      // Fallback: return raw content as summary
      return {
        summary: llmContent.substring(0, 500),
        findings: [],
        totalIssues: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        infoCount: 0,
      };
    }
  }

  private determineSeverity(result: ReviewResult): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' {
    if (result.criticalCount > 0) return 'CRITICAL';
    if (result.highCount > 0) return 'HIGH';
    if (result.mediumCount > 0) return 'MEDIUM';
    if (result.lowCount > 0) return 'LOW';
    return 'INFO';
  }

  private formatReviewComment(result: ReviewResult, cost: number, duration: number): string {
    const sections: string[] = [];

    // Header
    sections.push('# AI Code Review');
    sections.push('');
    sections.push(`**Status**: ${result.criticalCount > 0 ? 'Issues Found' : result.highCount > 0 ? 'Warnings' : 'Approved'}`);
    sections.push(`**Issues**: ${result.totalIssues} (${result.criticalCount} critical, ${result.highCount} high, ${result.mediumCount} medium)`);
    sections.push(`**Cost**: $${cost.toFixed(4)} | **Time**: ${(duration / 1000).toFixed(1)}s`);
    sections.push('');

    // Summary
    sections.push('## Summary');
    sections.push(result.summary);
    sections.push('');

    // Critical issues
    if (result.criticalCount > 0) {
      sections.push('## Critical Issues');
      sections.push('');
      result.findings
        .filter((f) => f.severity === 'critical')
        .forEach((finding, i) => {
          sections.push(`### ${i + 1}. ${finding.title}`);
          sections.push(`**File**: \`${finding.file}:${finding.line}\``);
          sections.push(`**Category**: ${finding.category}`);
          sections.push('');
          sections.push(finding.description);
          sections.push('');
          if (finding.suggestion) {
            sections.push(`**Fix**: ${finding.suggestion}`);
            sections.push('');
          }
          if (finding.codeSnippet && finding.fixedCode) {
            sections.push('```diff');
            sections.push(`- ${finding.codeSnippet}`);
            sections.push(`+ ${finding.fixedCode}`);
            sections.push('```');
            sections.push('');
          }
        });
    }

    // High priority issues
    if (result.highCount > 0) {
      sections.push('## High Priority Issues');
      sections.push('');
      result.findings
        .filter((f) => f.severity === 'high')
        .slice(0, 5)
        .forEach((finding, i) => {
          sections.push(`### ${i + 1}. ${finding.title}`);
          if (finding.file) sections.push(`**File**: \`${finding.file}:${finding.line}\``);
          sections.push(finding.description);
          sections.push('');
        });

      if (result.highCount > 5) {
        sections.push(`_...and ${result.highCount - 5} more high priority issues_`);
        sections.push('');
      }
    }

    // Footer
    sections.push('---');
    sections.push('*Generated by [Forge AI](https://github.com/yourusername/forge-ai)*');

    return sections.join('\n');
  }

  private generateCommitPrompt(commit: any, diff: string): string {
    const fileList = commit.files.map((f: any) => `  - [${f.status}] ${f.path} (+${f.additions}/-${f.deletions})`).join('\n');

    return `# Commit Review

## Commit Information
- **SHA**: ${commit.sha}
- **Author**: ${commit.author}
- **Message**: ${commit.message}
- **Date**: ${commit.date}

## Changes Summary
- **Files Changed**: ${commit.filesChanged}
- **Lines Added**: ${commit.additions}
- **Lines Deleted**: ${commit.deletions}

## Files Changed
${fileList}

## Diff
\`\`\`diff
${diff.substring(0, 50000)}
\`\`\`

Please review this commit and provide your findings in JSON format.`;
  }

  private formatCommitReviewComment(commit: any, result: ReviewResult, cost: number, duration: number): string {
    const sections: string[] = [];

    // Header
    sections.push('# AI Commit Review');
    sections.push('');
    sections.push(`**Commit**: \`${commit.sha.substring(0, 7)}\``);
    sections.push(`**Author**: ${commit.author}`);
    sections.push(`**Status**: ${result.criticalCount > 0 ? 'Issues Found' : result.highCount > 0 ? 'Warnings' : 'Approved'}`);
    sections.push(`**Issues**: ${result.totalIssues} (${result.criticalCount} critical, ${result.highCount} high, ${result.mediumCount} medium)`);
    sections.push(`**Cost**: $${cost.toFixed(4)} | **Time**: ${(duration / 1000).toFixed(1)}s`);
    sections.push('');

    // Summary
    sections.push('## Summary');
    sections.push(result.summary);
    sections.push('');

    // Critical issues
    if (result.criticalCount > 0) {
      sections.push('## Critical Issues');
      sections.push('');
      result.findings
        .filter((f) => f.severity === 'critical')
        .forEach((finding, i) => {
          sections.push(`### ${i + 1}. ${finding.title}`);
          sections.push(`**File**: \`${finding.file}:${finding.line}\``);
          sections.push(`**Category**: ${finding.category}`);
          sections.push('');
          sections.push(finding.description);
          sections.push('');
          if (finding.suggestion) {
            sections.push(`**Fix**: ${finding.suggestion}`);
            sections.push('');
          }
        });
    }

    // High priority issues (condensed)
    if (result.highCount > 0) {
      sections.push('## High Priority Issues');
      sections.push('');
      result.findings
        .filter((f) => f.severity === 'high')
        .slice(0, 3)
        .forEach((finding, i) => {
          sections.push(`### ${i + 1}. ${finding.title}`);
          if (finding.file) sections.push(`**File**: \`${finding.file}:${finding.line}\``);
          sections.push(finding.description);
          sections.push('');
        });

      if (result.highCount > 3) {
        sections.push(`_...and ${result.highCount - 3} more high priority issues_`);
        sections.push('');
      }
    }

    // Footer
    sections.push('---');
    sections.push('*Generated by [Forge AI](https://github.com/yourusername/forge-ai)*');

    return sections.join('\n');
  }
}
