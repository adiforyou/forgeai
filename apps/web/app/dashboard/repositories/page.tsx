"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { repositoryApi } from "@/lib/api";
import { Plus, Trash2, RefreshCw, Check, X, Github, Gitlab, Loader2 } from "lucide-react";

export default function RepositoriesPage() {
  const [showGithubRepos, setShowGithubRepos] = useState(false);
  const [showGitlabRepos, setShowGitlabRepos] = useState(false);
  const [showBitbucketRepos, setShowBitbucketRepos] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    platform: "github",
    repoFullName: "",
    autoReview: true,
    reviewStrategy: "single-pass",
  });

  const queryClient = useQueryClient();

  // Connected repositories
  const { data: repositories, isLoading } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await repositoryApi.list();
      return res.data.repositories;
    },
  });

  // GitHub repositories
  const {
    data: githubRepos,
    isLoading: githubLoading,
    error: githubError,
    refetch: refetchGithub,
  } = useQuery({
    queryKey: ["github-repos"],
    queryFn: async () => {
      const res = await repositoryApi.fetchGithub();
      return res.data.repositories;
    },
    enabled: showGithubRepos,
    retry: false,
  });

  // GitLab repositories
  const {
    data: gitlabRepos,
    isLoading: gitlabLoading,
    error: gitlabError,
    refetch: refetchGitlab,
  } = useQuery({
    queryKey: ["gitlab-repos"],
    queryFn: async () => {
      const res = await repositoryApi.fetchGitlab();
      return res.data.repositories;
    },
    enabled: showGitlabRepos,
    retry: false,
  });

  // Bitbucket repositories
  const {
    data: bitbucketRepos,
    isLoading: bitbucketLoading,
    error: bitbucketError,
    refetch: refetchBitbucket,
  } = useQuery({
    queryKey: ["bitbucket-repos"],
    queryFn: async () => {
      const res = await repositoryApi.fetchBitbucket();
      return res.data.repositories;
    },
    enabled: showBitbucketRepos,
    retry: false,
  });

  const addMutation = useMutation({
    mutationFn: (data: typeof formData) => repositoryApi.add(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      setShowAddForm(false);
      setFormData({
        platform: "github",
        repoFullName: "",
        autoReview: true,
        reviewStrategy: "single-pass",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repositoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
    },
  });

  const toggleAutoReviewMutation = useMutation({
    mutationFn: ({ id, autoReview }: { id: string; autoReview: boolean }) =>
      repositoryApi.update(id, { autoReview }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(formData);
  };

  const handleAddFromGithub = (repo: any) => {
    addMutation.mutate({
      platform: "github",
      repoFullName: repo.fullName,
      autoReview: true,
      reviewStrategy: "single-pass",
    });
  };

  const handleAddFromGitlab = (repo: any) => {
    addMutation.mutate({
      platform: "gitlab",
      repoFullName: repo.fullName,
      autoReview: true,
      reviewStrategy: "single-pass",
    });
  };

  const handleAddFromBitbucket = (repo: any) => {
    addMutation.mutate({
      platform: "bitbucket",
      repoFullName: repo.fullName,
      autoReview: true,
      reviewStrategy: "single-pass",
    });
  };

  const isAlreadyAdded = (fullName: string) => {
    return repositories?.some((r: any) => r.repoFullName === fullName);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Repositories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your connected repositories
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowGithubRepos(!showGithubRepos);
              setShowGitlabRepos(false);
              setShowBitbucketRepos(false);
              if (!showGithubRepos) {
                refetchGithub();
              }
            }}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-muted-foreground hover:border-primary/50 hover:bg-accent"
          >
            <Github className="h-4 w-4" />
            {showGithubRepos ? "Hide" : "GitHub"}
          </button>
          <button
            onClick={() => {
              setShowGitlabRepos(!showGitlabRepos);
              setShowGithubRepos(false);
              setShowBitbucketRepos(false);
              if (!showGitlabRepos) {
                refetchGitlab();
              }
            }}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-muted-foreground hover:border-primary/50 hover:bg-accent"
          >
            <Gitlab className="h-4 w-4" />
            {showGitlabRepos ? "Hide" : "GitLab"}
          </button>
          <button
            onClick={() => {
              setShowBitbucketRepos(!showBitbucketRepos);
              setShowGithubRepos(false);
              setShowGitlabRepos(false);
              if (!showBitbucketRepos) {
                refetchBitbucket();
              }
            }}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-muted-foreground hover:border-primary/50 hover:bg-accent"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M.778 1.213a.768.768 0 00-.768.892l3.263 19.811c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.891zM14.52 15.528H9.522L8.17 8.464h7.561z"/>
            </svg>
            {showBitbucketRepos ? "Hide" : "Bitbucket"}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Manually
          </button>
        </div>
      </div>

      {/* GitHub Repositories Browser */}
      {showGithubRepos && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your GitHub Repositories</h2>
            <button
              onClick={() => refetchGithub()}
              disabled={githubLoading}
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1 text-sm text-muted-foreground hover:border-primary/50 hover:bg-accent"
            >
              <RefreshCw className={`h-3 w-3 ${githubLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {githubLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : githubError ? (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm">
              <p className="font-medium text-yellow-200">Could not fetch your GitHub repositories</p>
              <p className="mt-1 text-yellow-300/80">
                {(githubError as any)?.response?.data?.error ||
                  "Make sure you've added your GitHub token in Settings"}
              </p>
              <a
                href="/dashboard/settings"
                className="mt-2 inline-block text-yellow-200 underline hover:text-yellow-100"
              >
                Go to Settings →
              </a>
            </div>
          ) : githubRepos && githubRepos.length > 0 ? (
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {githubRepos.map((repo: any) => (
                <div
                  key={repo.fullName}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:border-primary/50 hover:bg-accent"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{repo.fullName}</p>
                      {repo.isPrivate && (
                        <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                          Private
                        </span>
                      )}
                      {repo.language && (
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {repo.language}
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {repo.description.substring(0, 100)}
                        {repo.description.length > 100 ? "..." : ""}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      ⭐ {repo.stars} · Updated{" "}
                      {new Date(repo.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddFromGithub(repo)}
                    disabled={
                      isAlreadyAdded(repo.fullName) || addMutation.isPending
                    }
                    className={`ml-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${
                      isAlreadyAdded(repo.fullName)
                        ? "bg-secondary text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {isAlreadyAdded(repo.fullName) ? (
                      <>
                        <Check className="h-4 w-4" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Add
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">No repositories found</p>
          )}
        </div>
      )}

      {/* GitLab Repositories Browser */}
      {showGitlabRepos && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your GitLab Repositories</h2>
            <button
              onClick={() => refetchGitlab()}
              disabled={gitlabLoading}
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1 text-sm text-muted-foreground hover:border-primary/50 hover:bg-accent"
            >
              <RefreshCw className={`h-3 w-3 ${gitlabLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {gitlabLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : gitlabError ? (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm">
              <p className="font-medium text-yellow-200">Could not fetch your GitLab repositories</p>
              <p className="mt-1 text-yellow-300/80">
                {(gitlabError as any)?.response?.data?.error ||
                  "Make sure you've added your GitLab token in Settings"}
              </p>
              <a
                href="/dashboard/settings"
                className="mt-2 inline-block text-yellow-200 underline hover:text-yellow-100"
              >
                Go to Settings →
              </a>
            </div>
          ) : gitlabRepos && gitlabRepos.length > 0 ? (
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {gitlabRepos.map((repo: any) => (
                <div
                  key={repo.fullName}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:border-primary/50 hover:bg-accent"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{repo.fullName}</p>
                      {repo.isPrivate && (
                        <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                          Private
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {repo.description.substring(0, 100)}
                        {repo.description.length > 100 ? "..." : ""}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      Updated {new Date(repo.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddFromGitlab(repo)}
                    disabled={
                      isAlreadyAdded(repo.fullName) || addMutation.isPending
                    }
                    className={`ml-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${
                      isAlreadyAdded(repo.fullName)
                        ? "bg-secondary text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {isAlreadyAdded(repo.fullName) ? (
                      <>
                        <Check className="h-4 w-4" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Add
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">No repositories found</p>
          )}
        </div>
      )}

      {/* Bitbucket Repositories Browser */}
      {showBitbucketRepos && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Bitbucket Repositories</h2>
            <button
              onClick={() => refetchBitbucket()}
              disabled={bitbucketLoading}
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1 text-sm text-muted-foreground hover:border-primary/50 hover:bg-accent"
            >
              <RefreshCw className={`h-3 w-3 ${bitbucketLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {bitbucketLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : bitbucketError ? (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm">
              <p className="font-medium text-yellow-200">Could not fetch your Bitbucket repositories</p>
              <p className="mt-1 text-yellow-300/80">
                {(bitbucketError as any)?.response?.data?.error ||
                  "Make sure you've added your Bitbucket token and username in Settings"}
              </p>
              <a
                href="/dashboard/settings"
                className="mt-2 inline-block text-yellow-200 underline hover:text-yellow-100"
              >
                Go to Settings →
              </a>
            </div>
          ) : bitbucketRepos && bitbucketRepos.length > 0 ? (
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {bitbucketRepos.map((repo: any) => (
                <div
                  key={repo.fullName}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:border-primary/50 hover:bg-accent"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{repo.fullName}</p>
                      {repo.isPrivate && (
                        <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                          Private
                        </span>
                      )}
                      {repo.language && (
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {repo.language}
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {repo.description.substring(0, 100)}
                        {repo.description.length > 100 ? "..." : ""}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      Updated {new Date(repo.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddFromBitbucket(repo)}
                    disabled={
                      isAlreadyAdded(repo.fullName) || addMutation.isPending
                    }
                    className={`ml-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${
                      isAlreadyAdded(repo.fullName)
                        ? "bg-secondary text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {isAlreadyAdded(repo.fullName) ? (
                      <>
                        <Check className="h-4 w-4" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Add
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">No repositories found</p>
          )}
        </div>
      )}

      {/* Manual Add Form */}
      {showAddForm && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Add Repository Manually</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                Platform
              </label>
              <select
                value={formData.platform}
                onChange={(e) =>
                  setFormData({ ...formData, platform: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-primary focus:outline-none"
              >
                <option value="github">GitHub</option>
                <option value="gitlab">GitLab</option>
                <option value="bitbucket">Bitbucket</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                Repository Full Name
              </label>
              <input
                type="text"
                required
                value={formData.repoFullName}
                onChange={(e) =>
                  setFormData({ ...formData, repoFullName: e.target.value })
                }
                placeholder="owner/repo-name"
                className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                Review Strategy
              </label>
              <select
                value={formData.reviewStrategy}
                onChange={(e) =>
                  setFormData({ ...formData, reviewStrategy: e.target.value })
                }
                className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-primary focus:outline-none"
              >
                <option value="single-pass">Single Pass (Fast)</option>
                <option value="multi-pass">Multi Pass (Thorough)</option>
                <option value="security-audit">Security Audit</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoReview"
                checked={formData.autoReview}
                onChange={(e) =>
                  setFormData({ ...formData, autoReview: e.target.checked })
                }
                className="h-4 w-4 rounded border-border text-primary"
              />
              <label htmlFor="autoReview" className="ml-2 text-sm text-muted-foreground">
                Enable automatic reviews for new PRs
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={addMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {addMutation.isPending ? "Adding..." : "Add Repository"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-border bg-secondary px-4 py-2 text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Connected Repositories */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Connected Repositories ({repositories?.length || 0})</h2>
        {repositories && repositories.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {repositories.map((repo: any) => (
              <div
                key={repo.id}
                className="rounded-xl border border-border bg-card p-5 hover:border-primary/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        {repo.repoFullName}
                      </h3>
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {repo.platform}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p>
                        Strategy:{" "}
                        <span className="font-medium text-foreground">{repo.reviewStrategy}</span>
                      </p>
                      <p>
                        Auto-review:{" "}
                        <span
                          className={`font-medium ${
                            repo.autoReview ? "text-emerald-400" : "text-muted-foreground"
                          }`}
                        >
                          {repo.autoReview ? "Enabled" : "Disabled"}
                        </span>
                      </p>
                      <p>
                        Webhook:{" "}
                        {repo.webhookConfigured ? (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
                            <Check className="h-3 w-3" />
                            Configured
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-orange-400">
                            <X className="h-3 w-3" />
                            Not configured
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        toggleAutoReviewMutation.mutate({
                          id: repo.id,
                          autoReview: !repo.autoReview,
                        })
                      }
                      className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                      title={repo.autoReview ? "Disable auto-review" : "Enable auto-review"}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(repo.id)}
                      className="rounded-lg p-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      title="Delete repository"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {!repo.webhookConfigured && (
                  <div className="mt-4 rounded-lg border border-orange-500/20 bg-orange-500/10 p-3 text-sm">
                    <p className="font-medium text-orange-200">Webhook setup required</p>
                    <p className="mt-1 text-xs text-orange-300/80">
                      Configure webhook in repository settings to enable automatic
                      reviews
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Github className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              No repositories connected yet.
            </p>
            <p className="mt-2 text-sm text-muted-foreground/60">
              Click "GitHub", "GitLab", or "Bitbucket" to browse your repositories, or "Add Manually" to add any repository.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
