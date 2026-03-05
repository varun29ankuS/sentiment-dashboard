"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

interface Stats {
  totalCalls: number;
  avgScore: number;
  highRiskCount: number;
  followUpCount: number;
  unresolvedCount: number;
  sentimentDistribution: { sentiment: string; count: number }[];
  languageDistribution: { language: string; count: number }[];
  intentDistribution: { intent: string; count: number }[];
  resolutionDistribution: { status: string; count: number }[];
  satisfactionDistribution: { satisfaction: string; count: number }[];
  performanceDistribution: { performance: string; count: number }[];
  scoreDistribution: { score: number; count: number }[];
}

interface Call {
  id: number;
  detected_language: string;
  sentiment: string;
  sentiment_score: number;
  customer_intent: string;
  resolution_status: string;
}

const SATISFACTION_COLORS: Record<string, string> = {
  satisfied: "#22c55e",
  neutral: "#f59e0b",
  dissatisfied: "#ef4444",
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/calls").then((r) => r.json()),
    ]).then(([statsData, callsData]) => {
      setStats(statsData);
      setCalls(callsData);
    });
  }, []);

  if (!stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-9 w-16" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
              <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const satisfiedCount = stats.satisfactionDistribution.find((s) => s.satisfaction === "satisfied")?.count || 0;
  const satisfactionPct = stats.totalCalls > 0 ? Math.round((satisfiedCount / stats.totalCalls) * 100) : 0;
  const highRiskPct = stats.totalCalls > 0 ? Math.round((stats.highRiskCount / stats.totalCalls) * 100) : 0;

  const languageSentiment = computeLanguageSentiment(calls);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardDescription>Total Analyzed</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalCalls}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardDescription>Satisfaction Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              <span className={satisfactionPct >= 70 ? "text-green-600" : satisfactionPct >= 40 ? "text-amber-600" : "text-red-600"}>
                {satisfactionPct}%
              </span>
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardDescription>High Risk</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              <span className={highRiskPct > 20 ? "text-red-600" : "text-green-600"}>
                {highRiskPct}%
              </span>
              <span className="text-sm text-muted-foreground ml-1">({stats.highRiskCount})</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Satisfaction & Resolution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer Satisfaction</CardTitle>
            <CardDescription>Distribution of customer satisfaction levels</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.satisfactionDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="satisfaction" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.satisfactionDistribution.map((entry) => (
                    <Cell
                      key={entry.satisfaction}
                      fill={SATISFACTION_COLORS[entry.satisfaction] || "#94a3b8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resolution Status</CardTitle>
            <CardDescription>How calls are being resolved</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.resolutionDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="status" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Language-wise Sentiment */}
      <Card>
        <CardHeader>
          <CardTitle>Sentiment by Language</CardTitle>
          <CardDescription>Cross-tabulation of detected sentiment per language</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={languageSentiment}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="language" className="text-xs" />
              <YAxis allowDecimals={false} className="text-xs" />
              <Tooltip />
              <Legend />
              <Bar dataKey="positive" stackId="a" fill="#22c55e" name="Positive" />
              <Bar dataKey="negative" stackId="a" fill="#ef4444" name="Negative" />
              <Bar dataKey="neutral" stackId="a" fill="#94a3b8" name="Neutral" />
              <Bar dataKey="mixed" stackId="a" fill="#f59e0b" name="Mixed" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Intent Radar */}
      <Card>
        <CardHeader>
          <CardTitle>Intent Distribution</CardTitle>
          <CardDescription>Radar view of primary customer intents detected across calls</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={450}>
            <RadarChart data={stats.intentDistribution}>
              <PolarGrid className="stroke-muted" />
              <PolarAngleAxis dataKey="intent" className="text-xs" />
              <PolarRadiusAxis allowDecimals={false} className="text-xs" />
              <Radar
                dataKey="count"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.35}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function computeLanguageSentiment(calls: Call[]) {
  const map: Record<string, Record<string, number>> = {};
  for (const call of calls) {
    const lang = call.detected_language || "unknown";
    if (!map[lang]) map[lang] = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
    const s = call.sentiment || "neutral";
    map[lang][s] = (map[lang][s] || 0) + 1;
  }
  return Object.entries(map).map(([language, sentiments]) => ({
    language,
    ...sentiments,
  }));
}
