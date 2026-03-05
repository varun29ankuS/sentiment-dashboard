import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { DATA_DIR } from "./paths";

const DB_PATH = path.join(DATA_DIR, "results.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT UNIQUE NOT NULL,
      phone TEXT,
      extension TEXT,
      duration_sec REAL DEFAULT 0,
      detected_language TEXT DEFAULT 'unknown',
      transcript TEXT DEFAULT '',
      sentiment TEXT DEFAULT 'pending',
      sentiment_score INTEGER DEFAULT 0,
      customer_intent TEXT DEFAULT 'unknown',
      key_issues TEXT DEFAULT '[]',
      resolution_status TEXT DEFAULT 'unknown',
      upsell_opportunities TEXT DEFAULT '[]',
      customer_satisfaction TEXT DEFAULT 'unknown',
      call_summary TEXT DEFAULT '',
      agent_performance TEXT DEFAULT 'unknown',
      topics TEXT DEFAULT '[]',
      raw_analysis TEXT DEFAULT '{}',
      status TEXT DEFAULT 'uploaded',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

export function insertCall(data: {
  filename: string;
  phone: string;
  extension: string;
  duration_sec: number;
}) {
  const db = getDb();
  return db
    .prepare(
      `INSERT OR IGNORE INTO calls (filename, phone, extension, duration_sec, status)
       VALUES (?, ?, ?, ?, 'uploaded')`
    )
    .run(data.filename, data.phone, data.extension, data.duration_sec);
}

export function updateCallTranscript(
  filename: string,
  transcript: string,
  language: string
) {
  const db = getDb();
  db.prepare(
    `UPDATE calls SET transcript = ?, detected_language = ?, status = 'transcribed', updated_at = datetime('now')
     WHERE filename = ?`
  ).run(transcript, language, filename);
}

export function updateCallAnalysis(
  filename: string,
  analysis: Record<string, unknown>
) {
  const db = getDb();
  const arrayFields = [
    "key_issues", "upsell_opportunities", "topics", "action_items",
    "competitive_mentions", "objections_raised", "buying_signals", "emotion_tags",
  ];
  const stringify = (key: string) => {
    const val = analysis[key];
    return Array.isArray(val) ? JSON.stringify(val) : JSON.stringify(val ?? []);
  };

  db.prepare(
    `UPDATE calls SET
      sentiment = ?, sentiment_score = ?, customer_intent = ?,
      key_issues = ?, resolution_status = ?, upsell_opportunities = ?,
      customer_satisfaction = ?, call_summary = ?, agent_performance = ?,
      topics = ?, raw_analysis = ?,
      action_items = ?, risk_level = ?, risk_reason = ?,
      follow_up_required = ?, follow_up_suggestion = ?,
      competitive_mentions = ?, objections_raised = ?, buying_signals = ?,
      coaching_notes = ?, emotion_tags = ?, urgency = ?,
      suggested_response = ?, customer_name = ?,
      status = 'analyzed', updated_at = datetime('now')
     WHERE filename = ?`
  ).run(
    analysis.sentiment ?? "unknown",
    analysis.sentiment_score ?? 0,
    analysis.customer_intent ?? "unknown",
    stringify("key_issues"),
    analysis.resolution_status ?? "unknown",
    stringify("upsell_opportunities"),
    analysis.customer_satisfaction ?? "unknown",
    analysis.call_summary ?? "",
    analysis.agent_performance ?? "unknown",
    stringify("topics"),
    JSON.stringify(analysis),
    stringify("action_items"),
    analysis.risk_level ?? "low",
    analysis.risk_reason ?? "",
    analysis.follow_up_required ? 1 : 0,
    analysis.follow_up_suggestion ?? "",
    stringify("competitive_mentions"),
    stringify("objections_raised"),
    stringify("buying_signals"),
    analysis.coaching_notes ?? "",
    stringify("emotion_tags"),
    analysis.urgency ?? "normal",
    analysis.suggested_response ?? "",
    analysis.customer_name ?? "",
    filename
  );
}

export function updateCallStatus(filename: string, status: string) {
  const db = getDb();
  db.prepare(
    `UPDATE calls SET status = ?, updated_at = datetime('now') WHERE filename = ?`
  ).run(status, filename);
}

export function getCallByFilename(filename: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM calls WHERE filename = ?").get(filename);
}

export interface CallRecord {
  id: number;
  filename: string;
  phone: string;
  extension: string;
  duration_sec: number;
  detected_language: string;
  transcript: string;
  sentiment: string;
  sentiment_score: number;
  customer_intent: string;
  key_issues: string;
  resolution_status: string;
  upsell_opportunities: string;
  customer_satisfaction: string;
  call_summary: string;
  agent_performance: string;
  topics: string;
  status: string;
  created_at: string;
  updated_at: string;
  action_items: string;
  risk_level: string;
  risk_reason: string;
  follow_up_required: number;
  follow_up_suggestion: string;
  competitive_mentions: string;
  objections_raised: string;
  buying_signals: string;
  coaching_notes: string;
  emotion_tags: string;
  urgency: string;
  suggested_response: string;
  customer_name: string;
}
