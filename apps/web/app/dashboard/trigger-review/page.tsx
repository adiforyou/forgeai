"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { reviewApi, repositoryApi } from "@/lib/api";
import { CheckCircle, AlertCircle, Loader2, GitPullRequest, GitCommit } from "lucide-react";

export default function TriggerReviewPage() {
  const [reviewType, setReviewType] = useState<"pr" | "commit">("pr");
  const [formData, setFormData] = useState({
    platform: "github",
    owner: "",
    repo: "",
    prNumber: "",
    commitSha: "",
    strategy: "single-pass",
  });
  const [result, setResult] = useState<any>(null);

  const { data: repositories } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const res = await repositoryApi.list();
      return res.data.repositories;
    },
  });

  const triggerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload: any = {
        platform: data.platform,
        owner: data.owner,
        repo: data.repo,
        strategy: data.strategy,
      };

      if (reviewType === "pr") {
        payload.prNumber = parseInt(data.prNumber);
      } else {
        payload.commitSha = data.commitSha;
      }

      const response = await reviewApi.manual(payload);
      return response.data;
    },
    onSuccess: (data) => {
      setResult({ success: true, data });
    },
    onError: (error: any) => {
      setResult({
        success: false,
        error: error.response?.data?.error || "Failed to trigger review",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    triggerMutation.mutate(formData);
  };

  const handleRepoSelect = (repoFullName: string) => {
    const [owner, repo] = repoFullName.split("/");
    setFormData({ ...formData, owner, repo });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Trigger Manual Review</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manually trigger a review for any PR or commit
        </p>
      </div>

      <div className="rounded-xl bg-card border border-border p-6">
        {/* Review Type Toggle */}
        <div className="mb-6 flex gap-3">
          <button
            type="button"
            onClick={() => setReviewType("pr")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              reviewType === "pr"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <GitPullRequest className="h-4 w-4" />
            Review Pull Request
          </button>
          <button
            type="button"
            onClick={() => setReviewType("commit")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              reviewType === "commit"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <GitCommit className="h-4 w-4" />
            Review Commit
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Select from Connected Repos */}
          {repositories && repositories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Quick Select (Connected Repositories)
              </label>
              <select
                onChange={(e) => handleRepoSelect(e.target.value)}
                className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="">-- Select a repository --</option>
                {repositories.map((repo: any) => (
                  <option key={repo.id} value={repo.repoFullName}>
                    {repo.repoFullName} ({repo.platform})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {/* Owner */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Repository Owner
              </label>
              <input
                type="text"
                required
                value={formData.owner}
                onChange={(e) =>
                  setFormData({ ...formData, owner: e.target.value })
                }
                placeholder="e.g., facebook"
                className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Repo */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Repository Name
              </label>
              <input
                type="text"
                required
                value={formData.repo}
                onChange={(e) =>
                  setFormData({ ...formData, repo: e.target.value })
                }
                placeholder="e.g., react"
                className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* PR Number or Commit SHA */}
          {reviewType === "pr" ? (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Pull Request Number
              </label>
              <input
                type="number"
                required
                value={formData.prNumber}
                onChange={(e) =>
                  setFormData({ ...formData, prNumber: e.target.value })
                }
                placeholder="e.g., 123"
                className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Enter the PR number (just the number, not the full URL)
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Commit SHA
              </label>
              <input
                type="text"
                required
                value={formData.commitSha}
                onChange={(e) =>
                  setFormData({ ...formData, commitSha: e.target.value })
                }
                placeholder="e.g., a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
                className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Enter the full commit SHA or short SHA (first 7-40 characters)
              </p>
            </div>
          )}

          {/* Review Strategy */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Review Strategy
            </label>
            <select
              value={formData.strategy}
              onChange={(e) =>
                setFormData({ ...formData, strategy: e.target.value })
              }
              className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
            >
              <option value="single-pass">
                Single Pass - Fast (Gemini 2.0 Flash)
              </option>
              <option value="multi-pass">
                Multi Pass - Thorough (Gemini + GPT-4o)
              </option>
              <option value="security-audit">
                Security Audit - Security Focused (Claude 3.5)
              </option>
            </select>
          </div>

          {/* Platform */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Platform
            </label>
            <select
              value={formData.platform}
              onChange={(e) =>
                setFormData({ ...formData, platform: e.target.value })
              }
              className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
            >
              <option value="github">GitHub</option>
              <option value="gitlab">GitLab</option>
              <option value="bitbucket">Bitbucket</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={triggerMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {triggerMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Triggering Review...
              </>
            ) : (
              "Trigger Review"
            )}
          </button>
        </form>

        {/* Result Display */}
        {result && (
          <div
            className={`mt-6 rounded-lg p-4 border ${
              result.success
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-red-500/10 border-red-500/30"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3
                  className={`font-semibold ${
                    result.success ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {result.success ? "Review Triggered!" : "Failed to Trigger Review"}
                </h3>
                <div
                  className={`mt-2 text-sm ${
                    result.success ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {result.success ? (
                    <div>
                      <p>{result.data.message}</p>
                      {result.data.jobId && (
                        <p className="mt-2">
                          Job ID: <code className="font-mono text-xs bg-background/50 px-1.5 py-0.5 rounded">{result.data.jobId}</code>
                        </p>
                      )}
                      <p className="mt-3 font-medium">
                        Go to the{" "}
                        <a
                          href="/dashboard/reviews"
                          className="underline hover:text-emerald-300"
                        >
                          Reviews page
                        </a>{" "}
                        to see the results (may take 30-60 seconds)
                      </p>
                    </div>
                  ) : (
                    <p>{result.error}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="rounded-xl bg-card border border-border p-6">
        <h3 className="font-semibold text-foreground">How to Use</h3>
        <ol className="mt-4 space-y-2.5 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-primary font-medium">1.</span>
            <span>Choose review type: Pull Request or Commit</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-medium">2.</span>
            <span>Select a repository from the dropdown (if you've added one)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-medium">3.</span>
            <span>Or manually enter owner and repo name</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-medium">4.</span>
            <span>Enter PR number (for PR review) or commit SHA (for commit review)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-medium">5.</span>
            <span>Choose a review strategy based on your needs</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-medium">6.</span>
            <span>Click "Trigger Review"</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-medium">7.</span>
            <span>Wait 30-60 seconds for the AI to analyze the code</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-medium">8.</span>
            <span>Check the Reviews page to see the results</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-medium">9.</span>
            <span>The review comment will also be posted to GitHub</span>
          </li>
        </ol>
        <div className="mt-5 rounded-lg bg-primary/10 border border-primary/20 p-4">
          <p className="text-sm font-medium text-foreground">Commit Review</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Use commit review when you don't have a PR yet, or want to review specific commits.
            The AI will analyze the diff of that commit and provide feedback.
          </p>
        </div>
      </div>
    </div>
  );
}
