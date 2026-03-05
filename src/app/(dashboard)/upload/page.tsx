"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface UploadedFile {
  filename: string;
  phone: string;
  size: number;
}

interface ProcessResult {
  filename: string;
  status: string;
  sentiment?: string;
  sentiment_score?: number;
  call_summary?: string;
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [currentFile, setCurrentFile] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    setError("");
    setUploading(true);

    const wavFiles = Array.from(files).filter((f) => f.name.endsWith(".wav"));
    if (wavFiles.length === 0) {
      setError("Please upload .wav files only");
      setUploading(false);
      return;
    }

    const formData = new FormData();
    wavFiles.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setUploadedFiles((prev) => [...prev, ...data.files]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const processFiles = useCallback(async () => {
    if (uploadedFiles.length === 0) return;

    setProcessing(true);
    setResults([]);
    setError("");

    for (const file of uploadedFiles) {
      setCurrentFile(file.filename);
      try {
        const res = await fetch("/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.filename }),
        });
        const data = await res.json();

        if (!res.ok) {
          setResults((prev) => [
            ...prev,
            { filename: file.filename, status: "failed", error: data.error },
          ]);
        } else {
          setResults((prev) => [
            ...prev,
            {
              filename: data.filename,
              status: "analyzed",
              sentiment: data.sentiment,
              sentiment_score: data.sentiment_score,
              call_summary: data.call_summary,
            },
          ]);
        }
      } catch (e) {
        setResults((prev) => [
          ...prev,
          {
            filename: file.filename,
            status: "failed",
            error: e instanceof Error ? e.message : "Failed",
          },
        ]);
      }
    }

    setCurrentFile("");
    setProcessing(false);
  }, [uploadedFiles]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload]
  );

  const successCount = results.filter((r) => r.status === "analyzed").length;
  const failCount = results.filter((r) => r.status === "failed").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Upload Recordings</h1>

      {/* Drop Zone */}
      <Card>
        <CardContent className="pt-6">
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 cursor-pointer ${
              dragActive
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true;
              input.accept = ".wav";
              input.onchange = (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files) handleUpload(files);
              };
              input.click();
            }}
          >
            <div className="space-y-3">
              {uploading ? (
                <svg className="mx-auto h-12 w-12 text-muted-foreground animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : dragActive ? (
                <svg className="mx-auto h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="mx-auto h-12 w-12 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              <p className="text-lg font-medium">
                {uploading
                  ? "Uploading..."
                  : dragActive
                  ? "Drop files here"
                  : "Drop WAV files here or click to browse"}
              </p>
              <p className="text-sm text-muted-foreground">
                Supports .wav files. Multiple files allowed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Uploaded Files ({uploadedFiles.length})</CardTitle>
                <CardDescription>
                  Ready to process with Sarvam AI
                </CardDescription>
              </div>
              <Button
                onClick={processFiles}
                disabled={processing}
              >
                {processing
                  ? `Processing ${currentFile}...`
                  : "Process All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {uploadedFiles.map((file) => {
                const result = results.find(
                  (r) => r.filename === file.filename
                );
                const isProcessing = currentFile === file.filename;
                return (
                  <div
                    key={file.filename}
                    className={`flex items-center justify-between rounded-md border px-4 py-3 transition-colors ${
                      isProcessing ? "bg-primary/5 border-primary/30" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="h-5 w-5 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span className="font-mono text-sm">{file.phone}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isProcessing && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Processing...
                        </div>
                      )}
                      {result?.status === "analyzed" && (
                        <>
                          <Badge
                            variant={
                              result.sentiment === "positive"
                                ? "default"
                                : result.sentiment === "negative"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {result.sentiment} ({result.sentiment_score}/10)
                          </Badge>
                          <span
                            className="text-xs text-muted-foreground max-w-xs truncate cursor-pointer hover:text-foreground"
                            onClick={() => router.push("/calls")}
                          >
                            {result.call_summary}
                          </span>
                        </>
                      )}
                      {result?.status === "failed" && (
                        <Badge variant="destructive">
                          Failed: {result.error}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      {results.length > 0 && !processing && (
        <Card className={failCount === 0 ? "border-green-200 dark:border-green-800" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {failCount === 0 ? (
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              Processing Complete
            </CardTitle>
            <CardDescription>
              <span className="text-green-600 dark:text-green-400 font-medium">{successCount} analyzed</span>
              {failCount > 0 && (
                <span className="text-red-600 dark:text-red-400 font-medium"> | {failCount} failed</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/calls")}>
              View All Calls
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
