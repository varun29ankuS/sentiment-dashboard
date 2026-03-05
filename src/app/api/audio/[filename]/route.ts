import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { UPLOADS_DIR, SAMPLE_DIR } from "@/lib/paths";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const wavName = filename.endsWith(".wav") ? filename : filename + ".wav";

  let filePath = path.join(UPLOADS_DIR, wavName);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(SAMPLE_DIR, wavName);
  }
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": stat.size.toString(),
      "Accept-Ranges": "bytes",
    },
  });
}
