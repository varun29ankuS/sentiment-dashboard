import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { processCall } from "@/lib/sarvam";
import {
  updateCallTranscript,
  updateCallAnalysis,
  updateCallStatus,
  getDb,
  CallRecord,
} from "@/lib/db";
import { UPLOADS_DIR, SAMPLE_DIR } from "@/lib/paths";

export async function POST(request: NextRequest) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { error: "filename is required" },
        { status: 400 }
      );
    }

    // Find the WAV file in uploads or sample directory
    let filePath = path.join(UPLOADS_DIR, filename + ".wav");
    if (!fs.existsSync(filePath)) {
      filePath = path.join(SAMPLE_DIR, filename + ".wav");
    }
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `File not found: ${filename}.wav` },
        { status: 404 }
      );
    }

    // Update status to processing
    updateCallStatus(filename, "processing");

    // Run the full pipeline: transcribe → analyze
    const { transcript, language, analysis } = await processCall(filePath);

    // Save transcript
    updateCallTranscript(filename, transcript, language);

    // Save analysis
    updateCallAnalysis(filename, analysis);

    return NextResponse.json({
      filename,
      transcript: transcript.slice(0, 200) + (transcript.length > 200 ? "..." : ""),
      language,
      sentiment: analysis.sentiment,
      sentiment_score: analysis.sentiment_score,
      call_summary: analysis.call_summary,
      status: "analyzed",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Processing failed";
    // Try to update status to failed
    try {
      const { filename } = await request.clone().json();
      if (filename) updateCallStatus(filename, "failed");
    } catch {}
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Process all unprocessed calls (batch endpoint)
export async function PUT() {
  try {
    const db = getDb();
    const pending = db
      .prepare(
        "SELECT filename FROM calls WHERE status IN ('uploaded', 'failed') ORDER BY id"
      )
      .all() as Pick<CallRecord, "filename">[];

    if (pending.length === 0) {
      return NextResponse.json({ message: "No calls to process" });
    }

    const results: {
      filename: string;
      status: string;
      error?: string;
    }[] = [];

    for (const call of pending) {
      let filePath = path.join(UPLOADS_DIR, call.filename + ".wav");
      if (!fs.existsSync(filePath)) {
        filePath = path.join(SAMPLE_DIR, call.filename + ".wav");
      }

      if (!fs.existsSync(filePath)) {
        results.push({
          filename: call.filename,
          status: "skipped",
          error: "File not found",
        });
        continue;
      }

      try {
        updateCallStatus(call.filename, "processing");
        const { transcript, language, analysis } = await processCall(filePath);
        updateCallTranscript(call.filename, transcript, language);
        updateCallAnalysis(call.filename, analysis);
        results.push({ filename: call.filename, status: "analyzed" });
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Processing failed";
        updateCallStatus(call.filename, "failed");
        results.push({ filename: call.filename, status: "failed", error: msg });
      }
    }

    const analyzed = results.filter((r) => r.status === "analyzed").length;
    return NextResponse.json({
      message: `Processed ${analyzed}/${pending.length} calls`,
      results,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Batch processing failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
