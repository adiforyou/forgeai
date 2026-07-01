import { Gitlab } from '@gitbeaker/rest';
import type { PRInfo, PRDiff, FileChange } from '@prr/types';

export class GitLabProvider {
  private gitlab: InstanceType<typeof Gitlab>;

  constructor(token: string) {
    this.gitlab = new Gitlab({ token });
  }

  async getPR(owner: string, repo: string, prNumber: number): Promise<PRInfo> {
    const projectId = `${owner}/${repo}`;
    const mr = await this.gitlab.MergeRequests.show(projectId, prNumber);

    return {
      number: mr.iid,
      title: mr.title,
      description: mr.description || '',
      author: mr.author.username,
      branch: mr.source_branch,
      targetBranch: mr.target_branch,
      url: mr.web_url,
    };
  }

  async getDiff(owner: string, repo: string, prNumber: number): Promise<PRDiff> {
    const projectId = `${owner}/${repo}`;
    const [mr, changes] = await Promise.all([
      this.gitlab.MergeRequests.show(projectId, prNumber),
      this.gitlab.MergeRequests.changes(projectId, prNumber),
    ]);

    const diffContent = changes.changes?.map((change: any) => change.diff).join('\n') || '';

    return {
      content: diffContent,
      additions: mr.changes_count ? parseInt(mr.changes_count.split('/')[0]) : 0,
      deletions: mr.changes_count ? parseInt(mr.changes_count.split('/')[1]) : 0,
      filesChanged: changes.changes?.length || 0,
    };
  }

  async getFiles(owner: string, repo: string, prNumber: number): Promise<FileChange[]> {
    const projectId = `${owner}/${repo}`;
    const changes = await this.gitlab.MergeRequests.changes(projectId, prNumber);

    return (changes.changes || []).map((change: any) => ({
      path: change.new_path || change.old_path,
      status: change.new_file ? 'added' : change.deleted_file ? 'removed' : change.renamed_file ? 'renamed' : 'modified',
      additions: 0, // GitLab API doesn't provide per-file additions/deletions easily
      deletions: 0,
      patch: change.diff,
    }));
  }

  async getCommits(owner: string, repo: string, prNumber: number) {
    const projectId = `${owner}/${repo}`;
    const commits = await this.gitlab.MergeRequests.commits(projectId, prNumber);

    return commits.map((commit: any) => ({
      sha: commit.id,
      message: commit.message,
      author: commit.author_name,
      date: commit.created_at,
    }));
  }

  async postComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string
  ): Promise<{ id: number; url: string }> {
    const projectId = `${owner}/${repo}`;
    const note = await this.gitlab.MergeRequestNotes.create(projectId, prNumber, body);

    return {
      id: note.id,
      url: note.noteable_iid ? `https://gitlab.com/${owner}/${repo}/-/merge_requests/${prNumber}#note_${note.id}` : '',
    };
  }

  async postCommitComment(
    owner: string,
    repo: string,
    commitSha: string,
    body: string
  ): Promise<{ id: number; url: string }> {
    const projectId = `${owner}/${repo}`;
    const note = await this.gitlab.CommitDiscussions.create(projectId, commitSha, body);

    return {
      id: note.id,
      url: `https://gitlab.com/${owner}/${repo}/-/commit/${commitSha}#note_${note.id}`,
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
    const projectId = `${owner}/${repo}`;
    const discussion = await this.gitlab.MergeRequestDiscussions.create(projectId, prNumber, body, {
      position: {
        base_sha: commitSha,
        start_sha: commitSha,
        head_sha: commitSha,
        position_type: 'text',
        new_path: path,
        new_line: line,
      },
    });

    return {
      id: discussion.id,
      url: `https://gitlab.com/${owner}/${repo}/-/merge_requests/${prNumber}#note_${discussion.id}`,
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
    const projectId = `${owner}/${repo}`;

    // Post main comment
    const mainNote = await this.gitlab.MergeRequestNotes.create(projectId, prNumber, body);

    // Post inline comments
    for (const comment of comments) {
      await this.postInlineComment(owner, repo, prNumber, commitSha, comment.path, comment.line, comment.body);
    }

    // Approve/reject if needed
    if (event === 'APPROVE') {
      await this.gitlab.MergeRequestApprovals.approve(projectId, prNumber);
    }

    return {
      id: mainNote.id,
      url: `https://gitlab.com/${owner}/${repo}/-/merge_requests/${prNumber}#note_${mainNote.id}`,
    };
  }

  parseWebhookUrl(url: string): { owner: string; repo: string; prNumber: number } | null {
    const match = url.match(/gitlab\.com\/([^\/]+)\/([^\/]+)\/-\/merge_requests\/(\d+)/);
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
    const projects = await this.gitlab.Projects.all({
      membership: true,
      perPage: 100,
      orderBy: 'last_activity_at',
      sort: 'desc',
    });

    return projects.map((project: any) => ({
      fullName: project.path_with_namespace,
      name: project.name,
      owner: project.namespace.path,
      description: project.description,
      isPrivate: project.visibility !== 'public',
      defaultBranch: project.default_branch || 'main',
      language: null,
      stars: project.star_count || 0,
      updatedAt: project.last_activity_at,
    }));
  }

  async getCommit(owner: string, repo: string, sha: string) {
    const projectId = `${owner}/${repo}`;
    const commit = await this.gitlab.Commits.show(projectId, sha);
    const diff = await this.gitlab.Commits.diff(projectId, sha);

    return {
      sha: commit.id,
      message: commit.message,
      author: commit.author_name,
      date: commit.created_at,
      additions: commit.stats?.additions || 0,
      deletions: commit.stats?.deletions || 0,
      filesChanged: diff.length,
      files: diff.map((file: any) => ({
        path: file.new_path || file.old_path,
        status: file.new_file ? 'added' : file.deleted_file ? 'removed' : file.renamed_file ? 'renamed' : 'modified',
        additions: 0,
        deletions: 0,
        patch: file.diff,
      })),
    };
  }

  async getCommitDiff(owner: string, repo: string, sha: string): Promise<string> {
    const projectId = `${owner}/${repo}`;
    const diff = await this.gitlab.Commits.diff(projectId, sha);
    return diff.map((d: any) => d.diff).join('\n');
  }
}
