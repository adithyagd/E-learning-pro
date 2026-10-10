import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AttemptOption {
  id: string;
  text: string;
}
export interface AttemptQuestion {
  position: number;
  question_type: "single_choice" | "multiple_choice" | "true_false" | "scenario" | "decision";
  question_text: string;
  scenario_text: string | null;
  options: AttemptOption[];
  selected: string[];
  correct?: string[];
  is_correct?: boolean | null;
  explanation?: string;
}
export interface AttemptDetail {
  id: string;
  scope: "module" | "final";
  module_id: string | null;
  module_number: number | null;
  module_title: string | null;
  attempt_number: number;
  status: "in_progress" | "passed" | "failed" | "timed_out" | "abandoned";
  question_count: number;
  time_limit_seconds: number;
  pass_mark: number;
  started_at: string;
  expires_at: string;
  submitted_at: string | null;
  duration_seconds: number | null;
  correct_count: number | null;
  score_percent: number | null;
  passed: boolean | null;
  current_position: number;
  server_now: string;
  questions: AttemptQuestion[];
}

export const ATTEMPT_STATUS_LABEL: Record<AttemptDetail["status"], string> = {
  in_progress: "In progress",
  passed: "Passed",
  failed: "Failed",
  timed_out: "Timed out",
  abandoned: "Abandoned",
};

export const QUESTION_TYPE_LABEL: Record<AttemptQuestion["question_type"], string> = {
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  true_false: "True / False",
  scenario: "Scenario",
  decision: "Decision",
};

export const attemptQuery = (attemptId: string) =>
  queryOptions({
    queryKey: ["assessment", "attempt", attemptId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_assessment_attempt", { _attempt: attemptId });
      if (error) throw new Error("Unable to load this attempt.");
      return data as unknown as AttemptDetail;
    },
  });

/** Attempt history; RLS limits rows to candidates the viewer may see. */
export const attemptsQuery = (candidateId: string, moduleId?: string) =>
  queryOptions({
    queryKey: ["assessment", "attempts", candidateId, moduleId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("assessment_attempts")
        .select(
          "id, module_id, attempt_number, status, question_count, correct_count, score_percent, passed, pass_mark, started_at, submitted_at, duration_seconds, expires_at",
        )
        .eq("candidate_id", candidateId)
        .order("started_at", { ascending: false });
      if (moduleId) q = q.eq("module_id", moduleId);
      const { data, error } = await q;
      if (error) throw new Error("Unable to load attempts.");
      return data ?? [];
    },
  });

export const fmtDuration = (s: number | null | undefined) => {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
};

export interface FinalAttemptSummary {
  id: string;
  attempt_number: number;
  status: AttemptDetail["status"];
  score_percent: number | null;
  correct_count: number | null;
  question_count: number;
  passed: boolean | null;
  started_at: string;
  submitted_at: string | null;
  duration_seconds: number | null;
}
export interface FinalOverview {
  available: boolean;
  config_id?: string;
  question_count?: number;
  time_limit_seconds?: number;
  pass_mark?: number;
  eligible?: boolean;
  active_attempt_id?: string | null;
  passed?: boolean;
  certificate_status?: "pending_admin_approval" | null;
  attempts?: FinalAttemptSummary[];
}

/** Final Assessment state; eligibility is computed server-side. */
export const finalOverviewQuery = (candidateId: string) =>
  queryOptions({
    queryKey: ["assessment", "final", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("final_assessment_overview", {
        _candidate: candidateId,
      });
      if (error) throw new Error("Unable to load the Final Assessment.");
      return data as unknown as FinalOverview;
    },
  });

export function finalSummary(o: FinalOverview | undefined) {
  const list = (o?.attempts ?? []).filter((a) => a.status !== "in_progress");
  const best = list.reduce<number | null>(
    (b, a) => Math.max(b ?? 0, Number(a.score_percent ?? 0)),
    null,
  );
  const latest = list[0];
  const status = !o?.eligible
    ? "Locked"
    : o.passed
      ? "Passed — Certificate Pending Admin Approval"
      : o.active_attempt_id
        ? "In progress"
        : list.length
          ? "Not yet passed — retry available"
          : "Available";
  return { list, best, latest, status, count: (o?.attempts ?? []).length };
}
