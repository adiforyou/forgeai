"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reviewApi } from "@/lib/api";
import { ExternalLink, AlertCircle, CheckCircle, Clock, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ReviewsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: "",
    severity: "",
    model: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["reviews", page, filters],
    queryFn: async () => {
      const res = await reviewApi.list({
        page,
        limit: 20,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== "")
        ),
      });
      return res.data;
    },
  });

  const reviews = data?.reviews || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">View all PR reviews and their results</p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-muted-foreground">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value });
                setPage(1);
              }}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-primary focus:outline-none"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground">
              Severity
            </label>
            <select
              value={filters.severity}
              onChange={(e) => {
                setFilters({ ...filters, severity: e.target.value });
                setPage(1);
              }}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-primary focus:outline-none"
            >
              <option value="">All</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground">
              Model
            </label>
            <select
              value={filters.model}
              onChange={(e) => {
                setFilters({ ...filters, model: e.target.value });
                setPage(1);
              }}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-primary focus:outline-none"
            >
              <option value="">All</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
              <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review: any) => (
            <div
              key={review.id}
              onClick={() => router.push(`/dashboard/reviews/${review.id}`)}
              className="cursor-pointer rounded-xl border border-border bg-card p-5 hover:border-primary/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://github.com/${review.pullRequest?.repository?.repoFullName}/pull/${review.pullRequest?.prNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {review.pullRequest?.repository?.repoFullName}#
                      {review.pullRequest?.prNumber}
                    </a>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-1 text-foreground">
                    {review.pullRequest?.prTitle}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <StatusIcon status={review.status} />
                      {review.status}
                    </span>
                    <span>Model: {review.model}</span>
                    <span>Cost: ${review.costUsd?.toFixed(4) || "0.0000"}</span>
                    {review.commentUrls && review.commentUrls.length > 0 && (
                      <span className="flex items-center gap-1 text-primary">
                        <MessageSquare className="h-4 w-4" />
                        {review.commentUrls.length} comment{review.commentUrls.length > 1 ? "s" : ""} posted
                      </span>
                    )}
                    <span>
                      {new Date(review.createdAt).toLocaleDateString()}{" "}
                      {new Date(review.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getSeverityColor(
                      review.severity
                    )}`}
                  >
                    {review.severity || "INFO"}
                  </span>
                </div>
              </div>

              {review.status === "COMPLETED" && review.result && (
                <div className="mt-4 border-t border-border pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        Summary
                      </h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {review.result.summary?.substring(0, 150)}
                        {review.result.summary?.length > 150 ? "..." : ""}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        Statistics
                      </h4>
                      <div className="mt-1 flex gap-4 text-sm">
                        <span className="text-red-400">
                          Critical: {review.result.issuesBySeverity?.CRITICAL || 0}
                        </span>
                        <span className="text-orange-400">
                          High: {review.result.issuesBySeverity?.HIGH || 0}
                        </span>
                        <span className="text-yellow-400">
                          Medium: {review.result.issuesBySeverity?.MEDIUM || 0}
                        </span>
                        <span className="text-primary">
                          Low: {review.result.issuesBySeverity?.LOW || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {review.result.issues && review.result.issues.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-foreground">
                        Key Issues ({review.result.issues.length})
                      </h4>
                      <div className="mt-2 space-y-2">
                        {review.result.issues.slice(0, 3).map((issue: any, idx: number) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-border p-3 text-sm"
                          >
                            <div className="flex items-start gap-2">
                              <span
                                className={`mt-0.5 inline-flex rounded px-2 py-0.5 text-xs font-semibold ${getSeverityColor(
                                  issue.severity
                                )}`}
                              >
                                {issue.severity}
                              </span>
                              <div className="flex-1">
                                <p className="font-medium text-foreground">
                                  {issue.title}
                                </p>
                                <p className="mt-1 text-muted-foreground">
                                  {issue.description}
                                </p>
                                {issue.file && (
                                  <p className="mt-1 text-xs text-muted-foreground/60">
                                    {issue.file}
                                    {issue.line && `:${issue.line}`}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {review.result.issues.length > 3 && (
                          <p className="text-sm text-muted-foreground">
                            + {review.result.issues.length - 3} more issues
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {review.status === "FAILED" && review.error && (
                <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm">
                  <p className="font-medium text-red-200">Review failed</p>
                  <p className="mt-1 text-red-300/80">{review.error}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            No reviews found. Connect a repository to start reviewing PRs!
          </p>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="rounded-lg border border-border bg-secondary px-4 py-2 text-muted-foreground hover:border-primary/50 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.totalPages}
            className="rounded-lg border border-border bg-secondary px-4 py-2 text-muted-foreground hover:border-primary/50 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle className="h-4 w-4 text-emerald-400" />;
    case "FAILED":
      return <AlertCircle className="h-4 w-4 text-red-400" />;
    case "PENDING":
      return <Clock className="h-4 w-4 text-yellow-400" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return "border border-red-500/20 bg-red-500/10 text-red-200";
    case "HIGH":
      return "border border-orange-500/20 bg-orange-500/10 text-orange-200";
    case "MEDIUM":
      return "border border-yellow-500/20 bg-yellow-500/10 text-yellow-200";
    case "LOW":
      return "border border-primary/20 bg-primary/10 text-primary";
    default:
      return "border border-border bg-secondary text-muted-foreground";
  }
}
