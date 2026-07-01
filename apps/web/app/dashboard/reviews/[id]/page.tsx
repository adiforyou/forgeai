"use client";

import { useQuery } from "@tanstack/react-query";
import { reviewApi } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import {
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
  MessageSquare,
  FileCode,
  Zap,
} from "lucide-react";

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reviewId = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["review", reviewId],
    queryFn: async () => {
      const res = await reviewApi.get(reviewId);
      return res.data.review;
    },
    enabled: !!reviewId,
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2d2d2d] border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading review...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-4 text-xl font-semibold text-red-500">
          Review not found
        </h2>
        <p className="mt-2 text-sm text-red-400">
          The review you're looking for doesn't exist or you don't have access to it.
        </p>
        <button
          onClick={() => router.push("/dashboard/reviews")}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Back to Reviews
        </button>
      </div>
    );
  }

  const review = data;
  const findings = review.findings?.findings || [];
  const prUrl = review.pullRequest
    ? `https://github.com/${review.pullRequest.repository.repoFullName}/pull/${review.pullRequest.prNumber}`
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard/reviews")}
          className="rounded-lg border border-border p-2 hover:border-primary/50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Review Details</h1>
          {review.pullRequest && (
            <p className="mt-1 text-sm text-muted-foreground">
              {review.pullRequest.repository.repoFullName}#
              {review.pullRequest.prNumber}
            </p>
          )}
        </div>
      </div>

      {/* Status Card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {review.pullRequest && (
              <div className="mb-4">
                <a
                  href={prUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-base font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  {review.pullRequest.prTitle}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <StatusIcon status={review.status} />
                  <span className="text-sm font-semibold">{review.status}</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Model</p>
                <p className="mt-1.5 text-sm font-semibold">{review.model}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Strategy</p>
                <p className="mt-1.5 text-sm font-semibold">{review.strategy}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Cost</p>
                <p className="mt-1.5 text-sm font-semibold">
                  ${review.costUsd?.toFixed(4) || "0.0000"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="mt-1.5 text-sm font-semibold">
                  {review.duration
                    ? `${(review.duration / 1000).toFixed(1)}s`
                    : "N/A"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Tokens</p>
                <p className="mt-1.5 text-sm font-semibold">
                  {review.tokensTotal?.toLocaleString() || "0"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Started At</p>
                <p className="mt-1.5 text-xs">
                  {new Date(review.startedAt).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Completed At</p>
                <p className="mt-1.5 text-xs">
                  {review.completedAt
                    ? new Date(review.completedAt).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {review.severity && (
            <div className="ml-4 flex-shrink-0">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getSeverityColor(
                  review.severity
                )}`}
              >
                {review.severity}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* GitHub Comments */}
      {review.commentUrls && review.commentUrls.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <MessageSquare className="h-5 w-5 text-primary" />
            Posted Comments
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Links to the review comments posted on GitHub
          </p>
          <div className="mt-4 space-y-2">
            {review.commentUrls.map((url: string, idx: number) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 hover:border-primary/50 transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary">
                  Comment #{idx + 1}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  View on GitHub
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {review.summary && review.status === "COMPLETED" && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Summary</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-foreground leading-relaxed">
            {review.summary}
          </p>
        </div>
      )}

      {/* Findings */}
      {findings.length > 0 && review.status === "COMPLETED" && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Zap className="h-5 w-5 text-primary" />
            Findings ({findings.length})
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            All issues found during the review
          </p>

          <div className="mt-4 space-y-4">
            {findings.map((finding: any, idx: number) => (
              <div
                key={idx}
                className="rounded-lg border border-border bg-background p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${getSeverityColor(
                          finding.severity
                        )}`}
                      >
                        {finding.severity}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {finding.category}
                      </span>
                    </div>

                    <h3 className="mt-2 text-sm font-semibold text-foreground">
                      {finding.title}
                    </h3>

                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{finding.description}</p>

                    {finding.file && (
                      <div className="mt-3 flex items-center gap-2 rounded-md bg-accent p-2">
                        <FileCode className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-mono text-foreground">
                          {finding.file}
                          {finding.line && `:${finding.line}`}
                        </span>
                      </div>
                    )}

                    {finding.codeSnippet && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">
                          Code:
                        </p>
                        <pre className="overflow-x-auto rounded-md bg-[#0d1117] border border-[#30363d] p-3 text-xs text-[#e6edf3]">
                          <code>{finding.codeSnippet}</code>
                        </pre>
                      </div>
                    )}

                    {finding.suggestion && (
                      <div className="mt-3 rounded-md bg-primary/10 border border-primary/20 p-3">
                        <p className="text-xs font-medium text-primary mb-1.5">
                          Suggested Fix:
                        </p>
                        <p className="text-xs text-foreground leading-relaxed">
                          {finding.suggestion}
                        </p>
                      </div>
                    )}

                    {finding.fixedCode && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">
                          Fixed Code:
                        </p>
                        <pre className="overflow-x-auto rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
                          <code>{finding.fixedCode}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {review.status === "FAILED" && review.errorMessage && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-red-500">
            <XCircle className="h-5 w-5" />
            Error
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-red-400 leading-relaxed">
            {review.errorMessage}
          </p>
          {review.retryCount > 0 && (
            <p className="mt-2 text-xs text-red-400">
              Retry attempts: {review.retryCount}
            </p>
          )}
        </div>
      )}

      {/* Raw Data (for debugging) */}
      <details className="rounded-xl border border-border bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          Raw Review Data (Debug)
        </summary>
        <pre className="mt-3 overflow-x-auto text-xs text-muted-foreground">
          {JSON.stringify(review, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    case "FAILED":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "PENDING":
    case "QUEUED":
      return <Clock className="h-4 w-4 text-amber-500" />;
    case "IN_PROGRESS":
      return <Clock className="h-4 w-4 text-primary" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "CRITICAL":
    case "critical":
      return "bg-red-500/10 text-red-500 border border-red-500/20";
    case "HIGH":
    case "high":
      return "bg-orange-500/10 text-orange-500 border border-orange-500/20";
    case "MEDIUM":
    case "medium":
      return "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20";
    case "LOW":
    case "low":
      return "bg-primary/10 text-primary border border-primary/20";
    default:
      return "bg-muted/10 text-muted-foreground border border-border";
  }
}
