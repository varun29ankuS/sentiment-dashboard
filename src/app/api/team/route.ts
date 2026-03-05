import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export function GET() {
  const db = getDb();
  const members = db
    .prepare("SELECT * FROM team_members WHERE active = 1 ORDER BY name")
    .all();
  return NextResponse.json(members);
}

export async function POST(request: NextRequest) {
  const { name, role, email } = await request.json();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const db = getDb();
  const result = db
    .prepare("INSERT INTO team_members (name, role, email) VALUES (?, ?, ?)")
    .run(name, role || "agent", email || "");
  return NextResponse.json({ id: result.lastInsertRowid, name, role, email });
}
