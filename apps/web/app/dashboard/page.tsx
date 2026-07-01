"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsApi, reviewApi } from "@/lib/api";
import { FileCheck, DollarSign, Clock, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await analyticsApi.dashboard("month");
      return res.data.stats;
    },
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ["recent-reviews"],
    queryFn: async () => {
      const res = await reviewApi.list({ page: 1, limit: 5 });
      return res.data.reviews;
    },
  });

  if (statsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2d2d2d] border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      name: "Total Reviews",
      value: stats?.totalReviews || 0,
      icon: FileCheck,
    },
    {
      name: "Total Cost",
      value: `$${stats?.totalCost?.toFixed(2) || "0.00"}`,
      icon: DollarSign,
    },
    {
      name: "Time Saved",
      value: `${stats?.totalTimeSaved || 0}h`,
      icon: Clock,
    },
    {
      name: "Issues Found",
      value: (stats?.issuesFound?.critical || 0) + (stats?.issuesFound?.high || 0),
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your code reviews this month
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {stat.name}
                </p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Reviews */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Recent Reviews</h2>
        </div>
        <div className="divide-y divide-border">
          {reviewsLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
          ) : reviews && reviews.length > 0 ? (
            reviews.map((review: any) => (
              <div
                key={review.id}
                onClick={() => router.push(`/dashboard/reviews/${review.id}`)}
                className="p-5 cursor-pointer hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {review.pullRequest
                        ? `${review.pullRequest.repository?.repoFullName}#${review.pullRequest.prNumber}`
                        : `Review ${review.id.substring(0, 8)}`
                      }
                    </p>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {review.pullRequest?.prTitle || review.summary?.substring(0, 60) || "Commit review"}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{review.model}</span>
                      <span>${review.costUsd?.toFixed(4) || "0.0000"}</span>
                      <span className={`font-medium ${
                        review.status === "COMPLETED" ? "text-emerald-500" :
                        review.status === "FAILED" ? "text-red-500" : "text-amber-500"
                      }`}>
                        {review.status}
                      </span>
                      <span>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {review.severity && (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          review.severity === "CRITICAL"
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : review.severity === "HIGH"
                            ? "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                            : review.severity === "MEDIUM"
                            ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                            : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        }`}
                      >
                        {review.severity}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No reviews yet. Connect a repository to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
