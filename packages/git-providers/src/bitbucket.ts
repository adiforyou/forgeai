import axios, { AxiosInstance } from 'axios';
import type { PRInfo, PRDiff, FileChange } from '@prr/types';

export class BitbucketProvider {
  private client: AxiosInstance;
  private workspace: string;

  constructor(token: string, username: string) {
    this.workspace = username;
    this.client = axios.create({
      baseURL: 'https://api.bitbucket.org/2.0',
      auth: {
        username,
        password: token,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getPR(owner: string, repo: string, prNumber: number): Promise<PRInfo> {
    const { data } = await this.client.get(`/repositories/${owner}/${repo}/pullrequests/${prNumber}`);

    return {
      number: data.id,
      title: data.title,
      description: data.description || '',
      author: data.author.display_name,
      branch: data.source.branch.name,
      targetBranch: data.destination.branch.name,
      url: data.links.html.href,
    };
  }

  async getDiff(owner: string, repo: string, prNumber: number): Promise<PRDiff> {
    const [{ data: pr }, { data: diff }] = await Promise.all([
      this.client.get(`/repositories/${owner}/${repo}/pullrequests/${prNumber}`),
      this.client.get(`/repositories/${owner}/${repo}/pullrequests/${prNumber}/diff`, {
        headers: { Accept: 'text/plain' },
      }),
    ]);

    return {
      content: diff,
      additions: 0, // Bitbucket doesn't provide this easily
      deletions: 0,
      filesChanged: 0, // Will be computed from files
    };
  }

  async getFiles(owner: string, repo: string, prNumber: number): Promise<FileChange[]> {
    const { data } = await this.client.get(`/repositories/${owner}/${repo}/pullrequests/${prNumber}/diffstat`);

    return data.values.map((file: any) => ({
      path: file.new?.path || file.old?.path,
      status: file.status === 'added' ? 'added' :
              file.status === 'removed' ? 'removed' :
              file.status === 'renamed' ? 'renamed' : 'modified',
      additions: file.lines_added || 0,
      deletions: file.lines_removed || 0,
      patch: undefined,
    }));
  }

  async getCommits(owner: string, repo: string, prNumber: number) {
    const { data } = await this.client.get(`/repositories/${owner}/${repo}/pullrequests/${prNumber}/commits`);

    return data.values.map((commit: any) => ({
      sha: commit.hash,
      message: commit.message,
      author: commit.author.user?.display_name || commit.author.raw,
      date: commit.date,
    }));
  }

  async postComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string
  ): Promise<{ id: number; url: string }> {
    const { data } = await this.client.post(
      `/repositories/${owner}/${repo}/pullrequests/${prNumber}/comments`,
      {
        content: {
          raw: body,
        },
      }
    );

    return {
      id: data.id,
      url: data.links.html.href,
    };
  }

  async postCommitComment(
    owner: string,
    repo: string,
    commitSha: string,
    body: string
  ): Promise<{ id: number; url: string }> {
    const { data } = await this.client.post(
      `/repositories/${owner}/${repo}/commit/${commitSha}/comments`,
      {
        content: {
          raw: body,
        },
      }
    );

    return {
      id: data.id,
      url: data.links.html.href,
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
    const { data } = await this.client.post(
      `/repositories/${owner}/${repo}/pullrequests/${prNumber}/comments`,
      {
        content: {
          raw: body,
        },
        inline: {
          path,
          to: line,
        },
      }
    );

    return {
      id: data.id,
      url: data.links.html.href,
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
    // Post main comment
    const mainComment = await this.postComment(owner, repo, prNumber, body);

    // Post inline comments
    for (const comment of comments) {
      await this.postInlineComment(owner, repo, prNumber, commitSha, comment.path, comment.line, comment.body);
    }

    // Approve if needed
    if (event === 'APPROVE') {
      await this.client.post(`/repositories/${owner}/${repo}/pullrequests/${prNumber}/approve`);
    } else if (event === 'REQUEST_CHANGES') {
      await this.client.delete(`/repositories/${owner}/${repo}/pullrequests/${prNumber}/approve`);
    }

    return mainComment;
  }

  parseWebhookUrl(url: string): { owner: string; repo: string; prNumber: number } | null {
    const match = url.match(/bitbucket\.org\/([^\/]+)\/([^\/]+)\/pull-requests\/(\d+)/);
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
    const { data } = await this.client.get(`/repositories/${this.workspace}`, {
      params: {
        pagelen: 100,
        sort: '-updated_on',
      },
    });

    return data.values.map((repo: any) => ({
      fullName: repo.full_name,
      name: repo.name,
      owner: repo.owner.username,
      description: repo.description,
      isPrivate: repo.is_private,
      defaultBranch: repo.mainbranch?.name || 'main',
      language: repo.language,
      stars: 0,
      updatedAt: repo.updated_on,
    }));
  }

  async getCommit(owner: string, repo: string, sha: string) {
    const [{ data: commit }, { data: diff }] = await Promise.all([
      this.client.get(`/repositories/${owner}/${repo}/commit/${sha}`),
      this.client.get(`/repositories/${owner}/${repo}/diff/${sha}`, {
        headers: { Accept: 'text/plain' },
      }),
    ]);

    return {
      sha: commit.hash,
      message: commit.message,
      author: commit.author.user?.display_name || commit.author.raw,
      date: commit.date,
      additions: 0,
      deletions: 0,
      filesChanged: commit.summary?.files?.length || 0,
      files: [],
    };
  }

  async getCommitDiff(owner: string, repo: string, sha: string): Promise<string> {
    const { data } = await this.client.get(`/repositories/${owner}/${repo}/diff/${sha}`, {
      headers: { Accept: 'text/plain' },
    });
    return data;
  }
}
