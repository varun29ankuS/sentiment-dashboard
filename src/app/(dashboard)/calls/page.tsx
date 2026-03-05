"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Call {
  id: number;
  filename: string;
  phone: string;
  duration_sec: number;
  detected_language: string;
  sentiment: string;
  sentiment_score: number;
  customer_intent: string;
  resolution_status: string;
  call_summary: string;
  status: string;
  urgency: string;
  assigned_to: string;
  priority: string;
  customer_name: string;
  risk_level: string;
  emotion_tags: string[];
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
}

const SENTIMENT_VARIANT: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  positive: "default",
  negative: "destructive",
  neutral: "secondary",
  mixed: "outline",
};

const URGENCY_COLORS: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  normal: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  low: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_COLORS: Record<string, string> = {
  uploaded: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  processing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 animate-pulse",
  transcribed: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  analyzed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);

  const fetchCalls = () => {
    const params = new URLSearchParams();
    if (sentimentFilter && sentimentFilter !== "all") params.set("sentiment", sentimentFilter);
    if (searchQuery) params.set("search", searchQuery);

    fetch(`/api/calls?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setCalls(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchCalls();
  }, [sentimentFilter, searchQuery]);

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then(setTeam)
      .catch(() => {});
  }, []);

  const processCall = async (filename: string) => {
    setProcessingId(filename);
    try {
      await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      fetchCalls();
    } catch {}
    setProcessingId(null);
  };

  const deleteCall = async (callId: number) => {
    if (!confirm("Delete this call record? This cannot be undone.")) return;
    setCalls((prev) => prev.filter((c) => c.id !== callId));
    await fetch(`/api/calls/${callId}`, { method: "DELETE" });
  };

  const assignCall = async (callId: number, assignedTo: string) => {
    setCalls((prev) =>
      prev.map((c) => (c.id === callId ? { ...c, assigned_to: assignedTo } : c))
    );
    await fetch("/api/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId, assignedTo }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Call Records</h1>
        <Button asChild>
          <Link href="/upload">Upload New</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative w-64">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            placeholder="Search by phone, summary..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Sentiments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sentiments</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Calls Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {loading ? "Loading..." : `${calls.length} call${calls.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-5 w-48 flex-1" />
                </div>
              ))}
            </div>
          ) : calls.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <svg className="mx-auto h-16 w-16 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <p className="text-muted-foreground text-lg">No calls found</p>
              <p className="text-muted-foreground text-sm">Upload recordings to get started with analysis</p>
              <Button asChild className="mt-2">
                <Link href="/upload">Upload Recordings</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer / Phone</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call) => (
                    <TableRow
                      key={call.id}
                      className={`transition-colors ${call.risk_level === "high" ? "bg-red-50/50 dark:bg-red-950/20" : ""}`}
                    >
                      <TableCell>
                        <Link
                          href={`/calls/${call.id}`}
                          className="font-medium text-primary hover:underline flex items-center gap-1.5"
                        >
                          <svg className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {call.customer_name || call.phone}
                        </Link>
                        {call.customer_name && (
                          <div className="text-xs text-muted-foreground ml-5">{call.phone}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {call.status === "analyzed" ? (
                          <Badge
                            variant={SENTIMENT_VARIANT[call.sentiment] || "secondary"}
                          >
                            {call.sentiment}
                          </Badge>
                        ) : (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              STATUS_COLORS[call.status] || STATUS_COLORS.pending
                            }`}
                          >
                            {call.status}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {call.status === "analyzed" ? (
                          <span
                            className={`font-semibold ${
                              call.sentiment_score >= 7
                                ? "text-green-600 dark:text-green-400"
                                : call.sentiment_score >= 4
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {call.sentiment_score}/10
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {call.status === "analyzed" && call.urgency ? (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${URGENCY_COLORS[call.urgency] || URGENCY_COLORS.normal}`}>
                            {call.urgency}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={call.assigned_to || "unassigned"}
                          onValueChange={(value) =>
                            assignCall(call.id, value === "unassigned" ? "" : value)
                          }
                        >
                          <SelectTrigger className="h-8 w-[140px] text-xs">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">
                              <span className="text-muted-foreground">Unassigned</span>
                            </SelectItem>
                            {team
                              .filter((m) => m.name !== "Unassigned")
                              .map((m) => (
                                <SelectItem key={m.id} value={m.name}>
                                  {m.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{call.detected_language || "--"}</TableCell>
                      <TableCell>{Math.round(call.duration_sec)}s</TableCell>
                      <TableCell className="max-w-xs">
                        {call.call_summary ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm text-muted-foreground truncate block max-w-[200px]">
                                {call.call_summary}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-sm">
                              <p className="text-sm">{call.call_summary}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {(call.status === "uploaded" ||
                            call.status === "failed") && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => processCall(call.filename)}
                              disabled={processingId === call.filename}
                              className="h-7 text-xs"
                            >
                              {processingId === call.filename
                                ? "Processing..."
                                : "Analyze"}
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteCall(call.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
