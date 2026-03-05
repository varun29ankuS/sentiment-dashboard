import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { insertCall } from "@/lib/db";
import { UPLOADS_DIR } from "@/lib/paths";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    await mkdir(UPLOADS_DIR, { recursive: true });

    const uploaded: { filename: string; phone: string; size: number }[] = [];

    for (const file of files) {
      if (!file.name.endsWith(".wav")) {
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = path.join(UPLOADS_DIR, filename);
      await writeFile(filePath, buffer);

      // Parse phone from filename
      const stem = filename.replace(".wav", "");
      const parts = stem.split("_");
      const phone = parts[0] || "unknown";
      const extension = parts[1] || "000";

      // Estimate duration: WAV at 8kHz mono 16-bit = 16000 bytes/sec
      const durationSec = buffer.length / 16000;

      insertCall({
        filename: stem,
        phone,
        extension,
        duration_sec: durationSec,
      });

      uploaded.push({ filename: stem, phone, size: buffer.length });
    }

    return NextResponse.json({
      message: `${uploaded.length} file(s) uploaded`,
      files: uploaded,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
