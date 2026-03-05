"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface CallDetail {
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
  key_issues: string[];
  resolution_status: string;
  upsell_opportunities: string[];
  customer_satisfaction: string;
  call_summary: string;
  agent_performance: string;
  topics: string[];
  action_items: string[];
  risk_level: string;
  risk_reason: string;
  follow_up_required: number;
  follow_up_suggestion: string;
  competitive_mentions: string[];
  objections_raised: string[];
  buying_signals: string[];
  coaching_notes: string;
  emotion_tags: string[];
  urgency: string;
  suggested_response: string;
  customer_name: string;
  assigned_to: string;
  priority: string;
  assignment_notes: string;
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
}

const RISK_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const URGENCY_STYLES: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  normal: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400",
};

const EMOTION_COLORS: Record<string, string> = {
  frustrated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  angry: "bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  confused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  interested: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  satisfied: "bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  impatient: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  hesitant: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  enthusiastic: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400",
  disappointed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const SCORE_COLOR = (score: number) =>
  score >= 7 ? "text-green-600 dark:text-green-400" : score >= 4 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

const SCORE_RING_COLOR = (score: number) =>
  score >= 7 ? "stroke-green-500" : score >= 4 ? "stroke-amber-500" : "stroke-red-500";

function ScoreRing({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative h-14 w-14 flex-shrink-0">
      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="none" className="stroke-muted" strokeWidth="3" />
        <circle
          cx="20" cy="20" r="18" fill="none"
          className={SCORE_RING_COLOR(score)}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${SCORE_COLOR(score)}`}>
        {score}
      </span>
    </div>
  );
}

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [call, setCall] = useState<CallDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignForm, setAssignForm] = useState({
    assignedTo: "",
    priority: "normal",
    notes: "",
  });

  const fetchCall = useCallback(() => {
    fetch(`/api/calls/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Call not found");
        return res.json();
      })
      .then(setCall)
      .catch((e) => setError(e.message));
  }, [params.id]);

  useEffect(() => {
    fetchCall();
    fetch("/api/team")
      .then((r) => r.json())
      .then(setTeam)
      .catch(() => {});
  }, [fetchCall]);

  const handleAssign = async () => {
    if (!call) return;
    setAssigning(true);
    await fetch("/api/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callId: call.id,
        assignedTo: assignForm.assignedTo,
        priority: assignForm.priority,
        notes: assignForm.notes,
      }),
    });
    fetchCall();
    setAssigning(false);
  };

  const handleDelete = async () => {
    if (!call) return;
    if (!confirm("Delete this call record? This cannot be undone.")) return;
    await fetch(`/api/calls/${call.id}`, { method: "DELETE" });
    router.push("/calls");
  };

  if (error) {
    return (
      <div className="py-20 text-center space-y-3">
        <svg className="mx-auto h-12 w-12 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-semibold">Call not found</h2>
        <Link href="/calls" className="text-primary hover:underline block">
          Back to calls
        </Link>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link href="/calls" className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to calls
        </Link>
        <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground">
          <svg className="h-3.5 w-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start gap-5">
        <ScoreRing score={call.sentiment_score} />
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold truncate">
            {call.customer_name || call.phone}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {call.customer_name && (
              <span className="text-muted-foreground text-sm">{call.phone}</span>
            )}
            <span className="text-muted-foreground text-sm">
              {Math.floor(call.duration_sec / 60)}m {Math.round(call.duration_sec % 60)}s
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={
              call.sentiment === "positive" ? "default"
                : call.sentiment === "negative" ? "destructive"
                : "secondary"
            }>
              {call.sentiment}
            </Badge>
            {call.risk_level && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${RISK_STYLES[call.risk_level] || RISK_STYLES.low}`}>
                {call.risk_level.toUpperCase()} RISK
              </span>
            )}
            {call.urgency && call.urgency !== "normal" && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${URGENCY_STYLES[call.urgency] || ""}`}>
                {call.urgency.toUpperCase()}
              </span>
            )}
            {call.follow_up_required ? (
              <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 text-xs font-semibold text-orange-800 dark:text-orange-400">
                FOLLOW-UP
              </span>
            ) : null}
            {call.assigned_to && (
              <Badge variant="outline" className="ml-1">
                <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {call.assigned_to}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Emotion Tags */}
      {call.emotion_tags?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {call.emotion_tags.map((tag, i) => (
            <span
              key={i}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                EMOTION_COLORS[tag.toLowerCase()] || EMOTION_COLORS.neutral
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales Intel</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="assignment">Assignment</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  Language
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{call.detected_language}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Intent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-semibold capitalize">{call.customer_intent}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Resolution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-semibold capitalize">{call.resolution_status}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Satisfaction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-semibold capitalize">{call.customer_satisfaction}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Agent Rating
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-semibold capitalize">{call.agent_performance}</p>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Call Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed">{call.call_summary}</p>
            </CardContent>
          </Card>

          {/* Suggested Response */}
          {call.suggested_response && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Suggested Response
                </CardTitle>
                <CardDescription>Recommended reply or follow-up message</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-sm leading-relaxed">
                  {call.suggested_response}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Items */}
          {call.action_items?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Action Items
                </CardTitle>
                <CardDescription>Next steps for the sales team</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {call.action_items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Follow-up & Risk */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {call.follow_up_suggestion && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Follow-up Recommendation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{call.follow_up_suggestion}</p>
                </CardContent>
              </Card>
            )}
            {call.risk_reason && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{call.risk_reason}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* SALES INTEL TAB */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Buying Signals
                </CardTitle>
              </CardHeader>
              <CardContent>
                {call.buying_signals?.length > 0 ? (
                  <ul className="space-y-2">
                    {call.buying_signals.map((signal, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="text-green-700 dark:text-green-400">{signal}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">No buying signals detected</p>
                )}
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Objections Raised
                </CardTitle>
              </CardHeader>
              <CardContent>
                {call.objections_raised?.length > 0 ? (
                  <ul className="space-y-2">
                    {call.objections_raised.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                        <span className="text-red-700 dark:text-red-400">{obj}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">No objections noted</p>
                )}
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Competitive Mentions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {call.competitive_mentions?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {call.competitive_mentions.map((comp, i) => (
                      <Badge key={i} variant="destructive">{comp}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No competitors mentioned</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Key Issues</CardTitle>
              </CardHeader>
              <CardContent>
                {call.key_issues?.length > 0 ? (
                  <ul className="space-y-2">
                    {call.key_issues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/40 flex-shrink-0" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">No issues identified</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upsell Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                {call.upsell_opportunities?.length > 0 ? (
                  <ul className="space-y-2">
                    {call.upsell_opportunities.map((opp, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        {opp}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">None identified</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {call.topics?.map((topic, i) => (
                    <Badge key={i} variant="outline">{topic}</Badge>
                  ))}
                  {(!call.topics || call.topics.length === 0) && (
                    <p className="text-muted-foreground text-sm">No topics tagged</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TRANSCRIPT TAB */}
        <TabsContent value="transcript" className="space-y-4">
          {/* Audio Player */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                Audio Recording
              </CardTitle>
              <CardDescription>
                Duration: {Math.floor(call.duration_sec / 60)}m {Math.round(call.duration_sec % 60)}s | File: {call.filename}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <audio
                controls
                className="w-full"
                src={`/api/audio/${call.filename}.wav`}
              >
                Your browser does not support audio playback.
              </audio>
            </CardContent>
          </Card>

          {/* Transcript */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <TranscriptView text={call.transcript} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ASSIGNMENT TAB */}
        <TabsContent value="assignment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assign to Team Member</CardTitle>
              <CardDescription>Delegate this call for follow-up action</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Assign to</label>
                  <Select
                    value={assignForm.assignedTo || "none"}
                    onValueChange={(v) => setAssignForm((f) => ({ ...f, assignedTo: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select team member..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select team member...</SelectItem>
                      {team.map((m) => (
                        <SelectItem key={m.id} value={m.name}>
                          {m.name} ({m.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <Select
                    value={assignForm.priority}
                    onValueChange={(v) => setAssignForm((f) => ({ ...f, priority: v }))}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <label className="text-xs font-medium text-muted-foreground">Notes</label>
                  <Input
                    placeholder="Assignment notes..."
                    value={assignForm.notes}
                    onChange={(e) =>
                      setAssignForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                </div>
                <Button
                  onClick={handleAssign}
                  disabled={!assignForm.assignedTo || assigning}
                >
                  {assigning ? "Assigning..." : "Assign"}
                </Button>
              </div>
              {team.length === 0 && (
                <p className="text-xs text-destructive mt-2">
                  No team members loaded. Check /api/team endpoint.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Coaching Notes */}
          {call.coaching_notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Agent Coaching Notes
                </CardTitle>
                <CardDescription>Feedback to improve agent performance</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{call.coaching_notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Follow-up & Risk in assignment context */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {call.follow_up_suggestion && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Follow-up Recommendation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{call.follow_up_suggestion}</p>
                </CardContent>
              </Card>
            )}
            {call.risk_reason && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{call.risk_reason}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TranscriptView({ text }: { text: string }) {
  if (!text) {
    return <p className="text-muted-foreground text-sm">No transcript available</p>;
  }

  const hasDiarization = /\[(Agent|Customer)\]:/.test(text);

  let turns: { speaker: "Agent" | "Customer"; text: string }[];

  if (hasDiarization) {
    turns = text
      .split(/\n\n/)
      .filter(Boolean)
      .map((block) => {
        const match = block.match(/^\[(Agent|Customer)\]:\s*([\s\S]*)/);
        if (match) {
          return {
            speaker: match[1] as "Agent" | "Customer",
            text: match[2].trim(),
          };
        }
        return { speaker: "Agent" as const, text: block.trim() };
      })
      .filter((t) => t.text.length > 0);
  } else {
    const sentences = text
      .replace(/([.?!])\s+/g, "$1|||")
      .split("|||")
      .map((s) => s.trim())
      .filter(Boolean);

    turns = [];
    let currentSpeaker: "Agent" | "Customer" = "Agent";
    let currentText = "";
    const turnSignals = /^(hello|hi |yes |no |okay|ok |sure|haan|ji |nahi|ha ha|yeah|ma'am|sir|thank|accha|theek)/i;

    for (const s of sentences) {
      const prevEndsWithQuestion = currentText.trimEnd().endsWith("?");
      const startsWithSignal = turnSignals.test(s);

      if (currentText && (prevEndsWithQuestion || startsWithSignal)) {
        turns.push({ speaker: currentSpeaker, text: currentText.trim() });
        currentSpeaker = currentSpeaker === "Agent" ? "Customer" : "Agent";
        currentText = s + " ";
      } else {
        currentText += s + " ";
      }
    }
    if (currentText.trim()) {
      turns.push({ speaker: currentSpeaker, text: currentText.trim() });
    }
  }

  if (turns.length <= 1) {
    return (
      <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono bg-muted p-4 rounded-lg max-h-[600px] overflow-y-auto">
        {text}
      </pre>
    );
  }

  return (
    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
      {turns.map((turn, i) => (
        <div
          key={i}
          className={`flex gap-3 ${
            turn.speaker === "Customer" ? "flex-row-reverse" : ""
          }`}
        >
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              turn.speaker === "Agent"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
            }`}
          >
            {turn.speaker === "Agent" ? "A" : "C"}
          </div>
          <div
            className={`max-w-[80%] rounded-lg p-3 text-sm ${
              turn.speaker === "Agent"
                ? "bg-blue-50 dark:bg-blue-950/30"
                : "bg-green-50 dark:bg-green-950/30"
            }`}
          >
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${
              turn.speaker === "Agent"
                ? "text-blue-600 dark:text-blue-400"
                : "text-green-600 dark:text-green-400"
            }`}>
              {turn.speaker}
            </span>
            <p className="mt-1 leading-relaxed">{turn.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
