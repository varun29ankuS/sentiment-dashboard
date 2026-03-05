import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { callId, assignedTo, assignedBy, notes, priority } =
    await request.json();

  if (!callId) {
    return NextResponse.json({ error: "callId is required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    `UPDATE calls SET
      assigned_to = ?,
      assigned_by = ?,
      assignment_notes = ?,
      priority = ?,
      updated_at = datetime('now')
    WHERE id = ?`
  ).run(
    assignedTo || "",
    assignedBy || "",
    notes || "",
    priority || "normal",
    callId
  );

  return NextResponse.json({ success: true });
}
