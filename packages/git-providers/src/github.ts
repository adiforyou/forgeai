import { Octokit } from '@octokit/rest';
import type { PRInfo, PRDiff, FileChange } from '@prr/types';

export class GitHubProvider {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getPR(owner: string, repo: string, prNumber: number): Promise<PRInfo> {
    const { data } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    return {
      number: data.number,
      title: data.title,
      description: data.body || '',
      author: data.user?.login || 'unknown',
      branch: data.head.ref,
      targetBranch: data.base.ref,
      url: data.html_url,
    };
  }

  async getDiff(owner: string, repo: string, prNumber: number): Promise<PRDiff> {
    const { data: diff } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: {
        format: 'diff',
      },
    });

    const { data: prData } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    return {
      content: diff as any as string,
      additions: prData.additions,
      deletions: prData.deletions,
      filesChanged: prData.changed_files,
    };
  }

  async getFiles(owner: string, repo: string, prNumber: number): Promise<FileChange[]> {
    const { data } = await this.octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    return data.map((file) => ({
      path: file.filename,
      status: file.status as 'added' | 'modified' | 'removed' | 'renamed',
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch,
    }));
  }

  async getCommits(owner: string, repo: string, prNumber: number) {
    const { data } = await this.octokit.pulls.listCommits({
      owner,
      repo,
      pull_number: prNumber,
    });

    return data.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || 'unknown',
      date: commit.commit.author?.date || new Date().toISOString(),
    }));
  }

  async postComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string
  ): Promise<{ id: number; url: string }> {
    const { data } = await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body,
    });

    return {
      id: data.id,
      url: data.html_url,
    };
  }

  async postCommitComment(
    owner: string,
    repo: string,
    commitSha: string,
    body: string
  ): Promise<{ id: number; url: string }> {
    const { data } = await this.octokit.repos.createCommitComment({
      owner,
      repo,
      commit_sha: commitSha,
      body,
    });

    return {
      id: data.id,
      url: data.html_url,
    };
  }

  async postInlineComment(
    owner: string,
    repo: string,
    prNumber: number,
    commitSha: string,
    path: string,
    line: number,
    body: string
  ): Promise<{ id: number; url: string }> {
    const { data } = await this.octokit.pulls.createReviewComment({
      owner,
      repo,
      pull_number: prNumber,
      commit_id: commitSha,
      path,
      line,
      body,
    });

    return {
      id: data.id,
      url: data.html_url,
    };
  }

  async createReview(
    owner: string,
    repo: string,
    prNumber: number,
    commitSha: string,
    body: string,
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' = 'COMMENT',
    comments: Array<{
      path: string;
      line: number;
      body: string;
    }> = []
  ) {
    const { data } = await this.octokit.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      commit_id: commitSha,
      body,
      event,
      comments: comments.map((c) => ({
        path: c.path,
        line: c.line,
        body: c.body,
      })),
    });

    return {
      id: data.id,
      url: data.html_url,
    };
  }

  async setStatus(
    owner: string,
    repo: string,
    sha: string,
    state: 'error' | 'failure' | 'pending' | 'success',
    context: string,
    description: string,
    targetUrl?: string
  ) {
    await this.octokit.repos.createCommitStatus({
      owner,
      repo,
      sha,
      state,
      context,
      description,
      target_url: targetUrl,
    });
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  }

  parseWebhookUrl(url: string): { owner: string; repo: string; prNumber: number } | null {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
    if (!match) return null;

    return {
      owner: match[1],
      repo: match[2],
      prNumber: parseInt(match[3], 10),
    };
  }

  async listUserRepositories(): Promise<Array<{
    fullName: string;
    name: string;
    owner: string;
    description: string | null;
    isPrivate: boolean;
    defaultBranch: string;
    language: string | null;
    stars: number;
    updatedAt: string;
  }>> {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
      affiliation: 'owner,collaborator,organization_member',
    });

    return data.map(repo => ({
      fullName: repo.full_name,
      name: repo.name,
      owner: repo.owner.login,
      description: repo.description,
      isPrivate: repo.private,
      defaultBranch: repo.default_branch,
      language: repo.language,
      stars: repo.stargazers_count,
      updatedAt: repo.updated_at,
    }));
  }

  async getCommit(owner: string, repo: string, sha: string) {
    const { data } = await this.octokit.repos.getCommit({
      owner,
      repo,
      ref: sha,
    });

    return {
      sha: data.sha,
      message: data.commit.message,
      author: data.commit.author?.name || 'unknown',
      date: data.commit.author?.date || new Date().toISOString(),
      additions: data.stats?.additions || 0,
      deletions: data.stats?.deletions || 0,
      filesChanged: data.files?.length || 0,
      files: (data.files || []).map(file => ({
        path: file.filename,
        status: file.status as 'added' | 'modified' | 'removed' | 'renamed',
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch,
      })),
    };
  }

  async getCommitDiff(owner: string, repo: string, sha: string): Promise<string> {
    const { data } = await this.octokit.repos.getCommit({
      owner,
      repo,
      ref: sha,
      mediaType: {
        format: 'diff',
      },
    });

    return data as any as string;
  }
}
