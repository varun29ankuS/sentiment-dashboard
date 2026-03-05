import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const SARVAM_API_KEY = process.env.SARVAM_API_KEY || "";
const STT_URL = "https://api.sarvam.ai/speech-to-text";
const LLM_URL = "https://api.sarvam.ai/v1/chat/completions";

const ANALYSIS_PROMPT = `You are a senior sales operations analyst. Analyze the following sales call transcript and provide ACTIONABLE intelligence.

Return ONLY valid JSON (no markdown, no code blocks) with these exact fields:
{
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "sentiment_score": <1-10>,
  "detected_language": "<language>",
  "customer_intent": "purchase" | "inquiry" | "complaint" | "support" | "cancellation" | "feedback" | "follow_up" | "other",
  "key_issues": ["<specific issue>"],
  "resolution_status": "resolved" | "escalated" | "unresolved" | "not_applicable",
  "upsell_opportunities": ["<opportunity>"],
  "customer_satisfaction": "satisfied" | "dissatisfied" | "neutral",
  "call_summary": "<2-3 sentence factual summary>",
  "agent_performance": "excellent" | "good" | "average" | "poor",
  "topics": ["<topic>"],
  "action_items": ["<specific next step>"],
  "risk_level": "high" | "medium" | "low",
  "risk_reason": "<why at risk, or empty>",
  "follow_up_required": true | false,
  "follow_up_suggestion": "<what to follow up on>",
  "competitive_mentions": ["<competitor>"],
  "objections_raised": ["<objection>"],
  "buying_signals": ["<signal>"],
  "coaching_notes": "<feedback for agent>",
  "emotion_tags": ["<emotion detected>"],
  "urgency": "critical" | "high" | "normal" | "low",
  "suggested_response": "<specific follow-up action, 2-3 sentences>",
  "customer_name": "<name if mentioned, otherwise empty>"
}

TRANSCRIPT:
`;

function getWavDuration(filePath: string): number {
  const buf = fs.readFileSync(filePath);
  // WAV header: bytes 28-31 = byte rate, bytes 40-43 = data size
  const byteRate = buf.readUInt32LE(28);
  const dataSize = buf.readUInt32LE(40);
  return byteRate > 0 ? dataSize / byteRate : 0;
}

function findSilencePoints(
  buf: Buffer,
  dataOffset: number,
  dataSize: number,
  sampleRate: number,
  bytesPerSample: number,
  bitsPerSample: number
): number[] {
  // Scan audio in 100ms windows, find frames below energy threshold
  const windowSamples = Math.floor(sampleRate * 0.1); // 100ms
  const windowBytes = windowSamples * bytesPerSample;
  const silencePoints: number[] = [];

  for (let off = 0; off < dataSize - windowBytes; off += windowBytes) {
    let energy = 0;
    for (let s = 0; s < windowSamples; s++) {
      const bytePos = dataOffset + off + s * bytesPerSample;
      const sample =
        bitsPerSample === 16
          ? buf.readInt16LE(bytePos)
          : buf.readInt8(bytePos);
      energy += sample * sample;
    }
    const rms = Math.sqrt(energy / windowSamples);
    // Threshold: RMS below 300 for 16-bit audio is near-silence
    if (rms < (bitsPerSample === 16 ? 300 : 5)) {
      silencePoints.push(off);
    }
  }

  return silencePoints;
}

function splitWavIntoChunks(
  filePath: string,
  maxChunkSec: number = 28
): string[] {
  const duration = getWavDuration(filePath);
  if (duration <= 30) {
    return [filePath];
  }

  const tmpDir = path.join(process.cwd(), "tmp_chunks");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const baseName = path.basename(filePath, ".wav");
  const buf = fs.readFileSync(filePath);

  const numChannels = buf.readUInt16LE(22);
  const sampleRate = buf.readUInt32LE(24);
  const bitsPerSample = buf.readUInt16LE(34);
  const bytesPerSample = (bitsPerSample / 8) * numChannels;
  const dataOffset = 44;
  const dataSize = buf.readUInt32LE(40);
  const bytesPerSecond = sampleRate * bytesPerSample;
  const maxChunkBytes = maxChunkSec * bytesPerSecond;

  // Find all silence points in the audio
  const silencePoints = findSilencePoints(
    buf, dataOffset, dataSize, sampleRate, bytesPerSample, bitsPerSample
  );

  // Build chunks: try to split at silence near the max boundary
  const chunks: string[] = [];
  let chunkStart = 0;
  let chunkIndex = 0;

  while (chunkStart < dataSize) {
    let chunkEnd: number;

    if (chunkStart + maxChunkBytes >= dataSize) {
      // Last chunk — take everything remaining
      chunkEnd = dataSize;
    } else {
      // Find the best silence point between 50%-100% of max chunk size
      const searchStart = chunkStart + Math.floor(maxChunkBytes * 0.5);
      const searchEnd = chunkStart + maxChunkBytes;

      const candidates = silencePoints.filter(
        (p) => p >= searchStart && p <= searchEnd
      );

      if (candidates.length > 0) {
        // Pick the silence point closest to 80% of max (prefer natural breaks)
        const idealPoint = chunkStart + Math.floor(maxChunkBytes * 0.8);
        chunkEnd = candidates.reduce((best, p) =>
          Math.abs(p - idealPoint) < Math.abs(best - idealPoint) ? p : best
        );
      } else {
        // No silence found — fall back to max boundary
        chunkEnd = chunkStart + maxChunkBytes;
      }
    }

    const chunkData = buf.slice(dataOffset + chunkStart, dataOffset + chunkEnd);
    const chunkSize = chunkData.length;

    if (chunkSize < bytesPerSecond * 0.3) {
      break; // Skip tiny leftover chunks (<0.3s)
    }

    const header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.writeUInt32LE(36 + chunkSize, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(bytesPerSecond, 28);
    header.writeUInt16LE(bytesPerSample, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write("data", 36);
    header.writeUInt32LE(chunkSize, 40);

    const chunkPath = path.join(tmpDir, `${baseName}_chunk${chunkIndex}.wav`);
    fs.writeFileSync(chunkPath, Buffer.concat([header, chunkData]));
    chunks.push(chunkPath);

    chunkStart = chunkEnd;
    chunkIndex++;
  }

  return chunks;
}

async function transcribeChunk(
  filePath: string
): Promise<{ transcript: string; language: string }> {
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([fileBuffer], { type: "audio/wav" }),
    fileName
  );
  formData.append("model", "saaras:v3");
  formData.append("mode", "transcribe");

  const response = await fetch(STT_URL, {
    method: "POST",
    headers: { "api-subscription-key": SARVAM_API_KEY },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`STT failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    transcript: data.transcript || "",
    language: data.language_code || "unknown",
  };
}

export async function transcribeAudio(
  filePath: string
): Promise<{ transcript: string; language: string }> {
  if (!SARVAM_API_KEY) {
    throw new Error("SARVAM_API_KEY not configured");
  }

  const chunks = splitWavIntoChunks(filePath, 25);

  const transcripts: string[] = [];
  let detectedLanguage = "unknown";

  for (const chunk of chunks) {
    const { transcript, language } = await transcribeChunk(chunk);
    if (transcript.trim()) {
      transcripts.push(transcript);
    }
    if (language !== "unknown") {
      detectedLanguage = language;
    }

    // Clean up temp chunk files (but not the original)
    if (chunk !== filePath && chunk.includes("tmp_chunks")) {
      try { fs.unlinkSync(chunk); } catch {}
    }
  }

  return {
    transcript: transcripts.join(" "),
    language: detectedLanguage,
  };
}

export async function analyzeTranscript(transcript: string): Promise<{
  sentiment: string;
  sentiment_score: number;
  customer_intent: string;
  key_issues: string[];
  resolution_status: string;
  upsell_opportunities: string[];
  customer_satisfaction: string;
  call_summary: string;
  agent_performance: string;
  topics: string[];
  detected_language: string;
  action_items: string[];
  risk_level: string;
  risk_reason: string;
  follow_up_required: boolean;
  follow_up_suggestion: string;
  competitive_mentions: string[];
  objections_raised: string[];
  buying_signals: string[];
  coaching_notes: string;
  emotion_tags: string[];
  urgency: string;
  suggested_response: string;
  customer_name: string;
}> {
  if (!SARVAM_API_KEY) {
    throw new Error("SARVAM_API_KEY not configured");
  }

  const trimmed =
    transcript.length > 15000
      ? transcript.slice(0, 15000) + "\n...[truncated]"
      : transcript;

  const response = await fetch(LLM_URL, {
    method: "POST",
    headers: {
      "api-subscription-key": SARVAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sarvam-m",
      messages: [
        {
          role: "system",
          content:
            "You are a senior sales operations analyst. Always respond with valid JSON only. No markdown. Be specific and actionable.",
        },
        { role: "user", content: ANALYSIS_PROMPT + trimmed },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM analysis failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || "";

  if (content.startsWith("```")) {
    content = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(content.trim());
}

export async function processCall(filePath: string): Promise<{
  transcript: string;
  language: string;
  analysis: Awaited<ReturnType<typeof analyzeTranscript>>;
}> {
  // Step 1: Transcribe (auto-chunks if >30s)
  const { transcript, language } = await transcribeAudio(filePath);

  if (!transcript.trim()) {
    throw new Error("Empty transcript — audio may be silent or corrupted");
  }

  // Step 2: Analyze with enhanced prompt
  const analysis = await analyzeTranscript(transcript);
  analysis.detected_language = analysis.detected_language || language;

  return { transcript, language, analysis };
}
