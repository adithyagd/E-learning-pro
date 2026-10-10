import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CoachingStatus = Database["public"]["Enums"]["coaching_status"];
export type AcademyStatus = Database["public"]["Enums"]["academy_status"];

export const COACHING_STATUSES: CoachingStatus[] = ["open", "in_progress", "resolved"];
export const COACHING_LABEL: Record<CoachingStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};
export const COACHING_CLASS: Record<CoachingStatus, string> = {
  open: "border-warning/40 bg-warning/10 text-warning",
  in_progress: "border-info/30 bg-info/10 text-info",
  resolved: "border-success/30 bg-success/10 text-success",
};

export interface TraineeModule {
  module_number: number;
  title: string;
  pass_mark: number;
  status: "not_started" | "in_progress" | "completed";
  percentage: number;
  completed_lessons: number;
  total_lessons: number;
  assessment_passed: boolean;
  attempts: number;
  best_score: number | null;
  last_passed: boolean | null;
  last_attempt_at: string | null;
}

export interface Trainee {
  user_id: string;
  full_name: string | null;
  email: string | null;
  candidate_code: string;
  account_status: string;
  academy_status: AcademyStatus;
  progress_percent: number;
  department: string | null;
  designation: string | null;
  team_id: string | null;
  team_name: string | null;
  trainer_id: string | null;
  trainer_name: string | null;
  assigned_at: string | null;
  last_activity_at: string | null;
  modules: TraineeModule[] | null;
  final: { attempts: number; best_score: number | null; passed: boolean } | null;
  coaching_status: CoachingStatus | null;
  open_notes: number;
  next_follow_up: string | null;
}

/** Rows are scoped in the database to the caller's assigned trainees / managed teams. */
export const traineeOverviewQuery = () =>
  queryOptions({
    queryKey: ["staff", "overview"],
    queryFn: async (): Promise<Trainee[]> => {
      const { data, error } = await supabase.rpc("staff_trainee_overview");
      if (error) throw new Error("Trainee data could not be loaded.");
      return (data as unknown as Trainee[]) ?? [];
    },
  });

export const INACTIVE_DAYS = 14;

/** Reasons a trainee needs support, derived only from recorded data. */
export function supportReasons(t: Trainee, now = Date.now()): string[] {
  const r: string[] = [];
  const failed = (t.modules ?? []).filter((m) => m.last_passed === false && !m.assessment_passed);
  if (failed.length)
    r.push(`Failed Module ${failed.map((m) => m.module_number).join(", ")} assessment`);
  if (t.final && t.final.attempts > 0 && !t.final.passed) r.push("Final Assessment not passed");
  if (
    t.academy_status === "in_progress" &&
    t.last_activity_at &&
    now - new Date(t.last_activity_at).getTime() > INACTIVE_DAYS * 864e5
  )
    r.push(`No activity for ${INACTIVE_DAYS}+ days`);
  if (t.next_follow_up && new Date(t.next_follow_up).getTime() < now - 864e5)
    r.push("Coaching follow-up overdue");
  return r;
}

export function modulesCompleted(t: Trainee) {
  return (t.modules ?? []).filter((m) => m.status === "completed").length;
}

export interface ModuleStat {
  module_number: number;
  title: string;
  completed: number;
  inProgress: number;
  attempts: number;
  passedCandidates: number;
  attemptedCandidates: number;
}

export function moduleStats(rows: Trainee[]): ModuleStat[] {
  const map = new Map<number, ModuleStat>();
  for (const t of rows)
    for (const m of t.modules ?? []) {
      const s = map.get(m.module_number) ?? {
        module_number: m.module_number,
        title: m.title,
        completed: 0,
        inProgress: 0,
        attempts: 0,
        passedCandidates: 0,
        attemptedCandidates: 0,
      };
      if (m.status === "completed") s.completed++;
      else if (m.status === "in_progress") s.inProgress++;
      s.attempts += Number(m.attempts) || 0;
      if (m.attempts > 0) s.attemptedCandidates++;
      if (m.assessment_passed) s.passedCandidates++;
      map.set(m.module_number, s);
    }
  return [...map.values()].sort((a, b) => a.module_number - b.module_number);
}

/** Share of candidates who attempted an assessment and passed it (null when nobody attempted). */
export function passRate(stats: ModuleStat[]): number | null {
  const att = stats.reduce((a, s) => a + s.attemptedCandidates, 0);
  if (!att) return null;
  return (stats.reduce((a, s) => a + s.passedCandidates, 0) / att) * 100;
}

const ACTION_LABEL: Record<string, string> = {
  login: "Signed in",
  logout: "Signed out",
  module_opened: "Opened a module",
  module_started: "Started a module",
  module_completed: "Completed a module",
  lesson_opened: "Opened a lesson",
  lesson_started: "Started a lesson",
  lesson_completed: "Completed a lesson",
  learning_time: "Recorded learning time",
  assessment_started: "Started an assessment",
  assessment_resumed: "Resumed an assessment",
  assessment_submitted: "Submitted an assessment",
  assessment_passed: "Passed an assessment",
  assessment_failed: "Did not pass an assessment",
  assessment_retried: "Retried an assessment",
  assessment_timed_out: "Assessment timed out",
  final_assessment_opened: "Opened the Final Assessment",
  final_assessment_started: "Started the Final Assessment",
  final_assessment_submitted: "Submitted the Final Assessment",
  final_assessment_passed: "Passed the Final Assessment",
  final_assessment_failed: "Did not pass the Final Assessment",
  certificate_issued: "Certificate issued",
};
export const actionLabel = (a: string) => ACTION_LABEL[a] ?? a.replace(/_/g, " ");

export interface ActivityItem {
  id: string;
  user_id: string;
  action: string;
  created_at: string;
}

/** RLS returns only activity for candidates the caller may view. */
export const scopedActivityQuery = (userId?: string) =>
  queryOptions({
    queryKey: ["staff", "activity", userId ?? "all"],
    queryFn: async (): Promise<ActivityItem[]> => {
      let q = supabase
        .from("activity_logs")
        .select("id, user_id, action, created_at")
        .neq("action", "learning_time")
        .order("created_at", { ascending: false })
        .limit(userId ? 50 : 30);
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw new Error("Activity could not be loaded.");
      return data ?? [];
    },
  });

export const fmtDate = (d: string | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "—";
export const fmtDateTime = (d: string | null | undefined) =>
  d
    ? new Date(d).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    : "—";

export const rpcError = (m?: string) =>
  m && !/permission|violates|syntax|function|column/i.test(m)
    ? m
    : "The action could not be completed.";
