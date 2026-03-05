import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export function GET() {
  const db = getDb();

  const totalCalls = (
    db.prepare("SELECT COUNT(*) as count FROM calls").get() as { count: number }
  ).count;

  const avgScore = (
    db
      .prepare(
        "SELECT AVG(sentiment_score) as avg FROM calls WHERE sentiment_score > 0"
      )
      .get() as { avg: number }
  ).avg;

  const sentimentDistribution = db
    .prepare(
      "SELECT sentiment, COUNT(*) as count FROM calls GROUP BY sentiment ORDER BY count DESC"
    )
    .all() as { sentiment: string; count: number }[];

  const languageDistribution = db
    .prepare(
      "SELECT detected_language as language, COUNT(*) as count FROM calls GROUP BY detected_language ORDER BY count DESC"
    )
    .all() as { language: string; count: number }[];

  const intentDistribution = db
    .prepare(
      "SELECT customer_intent as intent, COUNT(*) as count FROM calls GROUP BY customer_intent ORDER BY count DESC"
    )
    .all() as { intent: string; count: number }[];

  const resolutionDistribution = db
    .prepare(
      "SELECT resolution_status as status, COUNT(*) as count FROM calls GROUP BY resolution_status ORDER BY count DESC"
    )
    .all() as { status: string; count: number }[];

  const satisfactionDistribution = db
    .prepare(
      "SELECT customer_satisfaction as satisfaction, COUNT(*) as count FROM calls GROUP BY customer_satisfaction ORDER BY count DESC"
    )
    .all() as { satisfaction: string; count: number }[];

  const performanceDistribution = db
    .prepare(
      "SELECT agent_performance as performance, COUNT(*) as count FROM calls GROUP BY agent_performance ORDER BY count DESC"
    )
    .all() as { performance: string; count: number }[];

  // Score distribution for histogram
  const scoreDistribution = db
    .prepare(
      "SELECT sentiment_score as score, COUNT(*) as count FROM calls WHERE sentiment_score > 0 GROUP BY sentiment_score ORDER BY score"
    )
    .all() as { score: number; count: number }[];

  const highRiskCount = (
    db.prepare("SELECT COUNT(*) as count FROM calls WHERE risk_level = 'high'").get() as { count: number }
  ).count;

  const followUpCount = (
    db.prepare("SELECT COUNT(*) as count FROM calls WHERE follow_up_required = 1").get() as { count: number }
  ).count;

  const unresolvedCount = (
    db.prepare("SELECT COUNT(*) as count FROM calls WHERE resolution_status = 'unresolved' OR resolution_status = 'escalated'").get() as { count: number }
  ).count;

  return NextResponse.json({
    totalCalls,
    avgScore: Math.round((avgScore || 0) * 10) / 10,
    highRiskCount,
    followUpCount,
    unresolvedCount,
    sentimentDistribution,
    languageDistribution,
    intentDistribution,
    resolutionDistribution,
    satisfactionDistribution,
    performanceDistribution,
    scoreDistribution,
  });
}
