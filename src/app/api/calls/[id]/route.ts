import { NextRequest, NextResponse } from "next/server";
import { getDb, CallRecord } from "@/lib/db";

export function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return params.then(({ id }) => {
    const db = getDb();
    const call = db
      .prepare("SELECT * FROM calls WHERE id = ?")
      .get(id) as CallRecord | undefined;

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const parsed = {
      ...call,
      key_issues: safeParseJson(call.key_issues),
      upsell_opportunities: safeParseJson(call.upsell_opportunities),
      topics: safeParseJson(call.topics),
      action_items: safeParseJson(call.action_items),
      competitive_mentions: safeParseJson(call.competitive_mentions),
      objections_raised: safeParseJson(call.objections_raised),
      buying_signals: safeParseJson(call.buying_signals),
      emotion_tags: safeParseJson(call.emotion_tags),
    };

    return NextResponse.json(parsed);
  });
}

export function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return params.then(({ id }) => {
    const db = getDb();
    const result = db.prepare("DELETE FROM calls WHERE id = ?").run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  });
}

function safeParseJson(str: string): string[] {
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}
