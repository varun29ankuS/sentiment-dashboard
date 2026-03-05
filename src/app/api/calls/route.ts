import { NextRequest, NextResponse } from "next/server";
import { getDb, CallRecord } from "@/lib/db";

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sentiment = searchParams.get("sentiment");
  const language = searchParams.get("language");
  const intent = searchParams.get("intent");
  const search = searchParams.get("search");

  const db = getDb();
  let query = "SELECT * FROM calls WHERE 1=1";
  const params: string[] = [];

  if (sentiment) {
    query += " AND sentiment = ?";
    params.push(sentiment);
  }
  if (language) {
    query += " AND detected_language = ?";
    params.push(language);
  }
  if (intent) {
    query += " AND customer_intent = ?";
    params.push(intent);
  }
  if (search) {
    query += " AND (phone LIKE ? OR call_summary LIKE ? OR transcript LIKE ?)";
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += " ORDER BY id DESC";

  const calls = db.prepare(query).all(...params) as CallRecord[];

  // Parse JSON string fields
  const parsed = calls.map((call) => ({
    ...call,
    key_issues: safeParseJson(call.key_issues),
    upsell_opportunities: safeParseJson(call.upsell_opportunities),
    topics: safeParseJson(call.topics),
    emotion_tags: safeParseJson(call.emotion_tags),
  }));

  return NextResponse.json(parsed);
}

function safeParseJson(str: string): string[] {
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}
