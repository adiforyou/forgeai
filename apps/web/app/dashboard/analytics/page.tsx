"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  DollarSign,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

const SEVERITY_COLORS = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#eab308",
  low: "#3b82f6",
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ["analytics-dashboard", period],
    queryFn: async () => {
      const res = await analyticsApi.dashboard(period);
      return res.data.stats;
    },
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["analytics-trends", period],
    queryFn: async () => {
      const res = await analyticsApi.trends(period);
      return res.data.trends;
    },
  });

  const { data: costBreakdown } = useQuery({
    queryKey: ["analytics-cost", period],
    queryFn: async () => {
      const res = await analyticsApi.costBreakdown(period);
      return res.data;
    },
  });

  if (dashboardLoading || trendsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2d2d2d] border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const costByModel = costBreakdown?.byModel
    ? Object.entries(costBreakdown.byModel).map(([name, value]) => ({
        name: name
          .replace("claude-3-5-sonnet-20241022", "Claude 3.5")
          .replace("gemini-2.0-flash-exp", "Gemini Flash")
          .replace("gpt-4o", "GPT-4o"),
        value: Number(value),
      }))
    : [];

  const issueDistribution = dashboard?.issuesFound
    ? [
        { name: "Critical", value: dashboard.issuesFound.critical || 0 },
        { name: "High", value: dashboard.issuesFound.high || 0 },
        { name: "Medium", value: dashboard.issuesFound.medium || 0 },
        { name: "Low", value: dashboard.issuesFound.low || 0 },
      ].filter((item) => item.value > 0)
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track performance, insights, and metrics across your reviews
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
        >
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Reviews"
          value={dashboard?.totalReviews || 0}
          icon={<Activity size={18} />}
        />
        <MetricCard
          title="Total Cost"
          value={`$${dashboard?.totalCost?.toFixed(2) || "0.00"}`}
          icon={<DollarSign size={18} />}
        />
        <MetricCard
          title="Time Saved"
          value={`${dashboard?.totalTimeSaved || 0}h`}
          icon={<Clock size={18} />}
        />
        <MetricCard
          title="Avg Review Time"
          value={`${dashboard?.avgReviewTime?.toFixed(1) || "0.0"}s`}
          icon={<TrendingUp size={18} />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Reviews Over Time */}
        <ChartCard title="Reviews Over Time">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
              <XAxis
                dataKey="date"
                stroke="#555"
                tick={{ fill: "#9d9d9d", fontSize: 12 }}
              />
              <YAxis stroke="#555" tick={{ fill: "#9d9d9d", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1d1d1d",
                  border: "1px solid #2d2d2d",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="reviews"
                stroke="#7320DD"
                strokeWidth={2}
                dot={{ fill: "#7320DD", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Cost Over Time */}
        <ChartCard title="Cost Over Time">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
              <XAxis
                dataKey="date"
                stroke="#555"
                tick={{ fill: "#9d9d9d", fontSize: 12 }}
              />
              <YAxis stroke="#555" tick={{ fill: "#9d9d9d", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1d1d1d",
                  border: "1px solid #2d2d2d",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Cost by Model */}
        <ChartCard title="Cost by Model">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costByModel}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
              <XAxis
                dataKey="name"
                stroke="#555"
                tick={{ fill: "#9d9d9d", fontSize: 11 }}
              />
              <YAxis stroke="#555" tick={{ fill: "#9d9d9d", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1d1d1d",
                  border: "1px solid #2d2d2d",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="value" fill="#7320DD" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Issues by Severity */}
        <ChartCard title="Issues by Severity">
          {issueDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={issueDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  dataKey="value"
                  stroke="#1d1d1d"
                  strokeWidth={2}
                >
                  {issueDistribution.map((entry, index) => {
                    const colorMap: Record<string, string> = {
                      Critical: SEVERITY_COLORS.critical,
                      High: SEVERITY_COLORS.high,
                      Medium: SEVERITY_COLORS.medium,
                      Low: SEVERITY_COLORS.low,
                    };
                    return (
                      <Cell key={`cell-${index}`} fill={colorMap[entry.name]} />
                    );
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1d1d1d",
                    border: "1px solid #2d2d2d",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No issues found in this period
            </div>
          )}
        </ChartCard>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Review Statistics */}
        <StatsCard title="Review Statistics">
          <div className="space-y-3">
            <StatRow
              label="Completed"
              value={dashboard?.reviewsByStatus?.COMPLETED || 0}
              icon={<CheckCircle size={14} className="text-emerald-500" />}
            />
            <StatRow
              label="Pending"
              value={dashboard?.reviewsByStatus?.PENDING || 0}
              icon={<Clock size={14} className="text-amber-500" />}
            />
            <StatRow
              label="Failed"
              value={dashboard?.reviewsByStatus?.FAILED || 0}
              icon={<XCircle size={14} className="text-red-500" />}
            />
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Success Rate
                </span>
                <span className="text-lg font-bold text-emerald-500">
                  {dashboard?.totalReviews
                    ? (
                        ((dashboard.reviewsByStatus?.COMPLETED || 0) /
                          dashboard.totalReviews) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </StatsCard>

        {/* Issue Statistics */}
        <StatsCard title="Issue Statistics">
          <div className="space-y-3">
            <StatRow
              label="Critical Issues"
              value={dashboard?.issuesFound?.critical || 0}
              valueColor="text-red-500"
              icon={
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              }
            />
            <StatRow
              label="High Priority"
              value={dashboard?.issuesFound?.high || 0}
              valueColor="text-orange-500"
              icon={
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
              }
            />
            <StatRow
              label="Medium Priority"
              value={dashboard?.issuesFound?.medium || 0}
              valueColor="text-yellow-500"
              icon={
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
              }
            />
            <StatRow
              label="Low Priority"
              value={dashboard?.issuesFound?.low || 0}
              valueColor="text-blue-500"
              icon={
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              }
            />
          </div>
        </StatsCard>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-primary">{icon}</div>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-base font-semibold mb-4">{title}</h2>
      <div className="h-64">{children}</div>
    </div>
  );
}

function StatsCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-base font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function StatRow({
  label,
  value,
  valueColor = "text-foreground",
  icon,
}: {
  label: string;
  value: string | number;
  valueColor?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${valueColor}`}>{value}</span>
    </div>
  );
}
