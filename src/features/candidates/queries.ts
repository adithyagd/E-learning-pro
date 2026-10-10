import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AcademyStatus, AccountStatus, CandidateRow } from "./schema";

export const SORT_FIELDS = [
  "created_at",
  "full_name",
  "candidate_id",
  "joining_date",
  "progress_percent",
  "account_status",
] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export const PAGE_SIZES = [10, 25, 50] as const;

export interface ListParams {
  q?: string | undefined;
  account?: AccountStatus | undefined;
  academy?: AcademyStatus | undefined;
  sort: SortField;
  dir: "asc" | "desc";
  page: number;
  size: number;
}

/** Strip characters that have meaning in PostgREST filter syntax. */
function cleanSearch(q: string) {
  return q
    .replace(/[,()*%\\]/g, " ")
    .trim()
    .slice(0, 100);
}

export const candidateListQuery = (p: ListParams) =>
  queryOptions({
    queryKey: ["candidates", "list", p],
    queryFn: async (): Promise<{ rows: CandidateRow[]; total: number }> => {
      let q = supabase.from("candidate_directory").select("*", { count: "exact" });
      const term = p.q ? cleanSearch(p.q) : "";
      if (term) {
        const like = `%${term}%`;
        q = q.or(
          ["full_name", "candidate_id", "hr_employee_id", "email", "phone"]
            .map((c) => `${c}.ilike.${like}`)
            .join(","),
        );
      }
      if (p.account) q = q.eq("account_status", p.account);
      if (p.academy) q = q.eq("academy_status", p.academy);
      const from = (p.page - 1) * p.size;
      const { data, error, count } = await q
        .order(p.sort, { ascending: p.dir === "asc", nullsFirst: false })
        .order("user_id")
        .range(from, from + p.size - 1);
      if (error) throw new Error("Unable to load candidates.");
      return { rows: data ?? [], total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });

export const candidateQuery = (userId: string) =>
  queryOptions({
    queryKey: ["candidates", "detail", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_directory")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error("Unable to load candidate.");
      return data;
    },
  });

export const ACTIVITY_LABEL: Record<string, string> = {
  login: "Signed in",
  logout: "Signed out",
  login_failed: "Sign-in failed",
  access_denied: "Access denied",
  password_reset_requested: "Password reset requested",
  password_changed: "Password changed",
  candidate_created: "Candidate created",
  candidate_updated: "Profile updated",
  candidate_activated: "Account activated",
  candidate_suspended: "Account suspended",
  candidate_disabled: "Account disabled",
  candidate_reenabled: "Account re-enabled",
  candidate_invited: "Invitation sent",
  candidate_viewed: "Profile viewed",
  module_opened: "Module opened",
  lesson_opened: "Lesson opened",
  module_started: "Module started",
  module_completed: "Module completed",
  lesson_started: "Lesson started",
  lesson_completed: "Lesson completed",
  assessment_started: "Assessment started",
  assessment_submitted: "Assessment submitted",
  assessment_passed: "Assessment passed",
  assessment_failed: "Assessment failed",
  assessment_retried: "Assessment retried",
  learning_time: "Learning time",
  final_assessment_completed: "Final assessment completed",
  final_assessment_passed: "Final assessment passed",
  certificate_approved: "Certificate approved",
  certificate_issued: "Certificate issued",
};

export const CANDIDATE_MGMT_ACTIONS = [
  "candidate_created",
  "candidate_updated",
  "candidate_activated",
  "candidate_suspended",
  "candidate_disabled",
  "candidate_reenabled",
  "candidate_invited",
  "candidate_viewed",
] as const;

export interface ActivityParams {
  userId?: string | undefined;
  page: number;
  size: number;
  onlyManagement?: boolean | undefined;
}

export const activityQuery = (p: ActivityParams) =>
  queryOptions({
    queryKey: ["activity", p],
    queryFn: async () => {
      let q = supabase
        .from("activity_logs")
        .select("id, user_id, target_user_id, role, action, metadata, created_at", {
          count: "exact",
        });
      if (p.userId) q = q.or(`user_id.eq.${p.userId},target_user_id.eq.${p.userId}`);
      if (p.onlyManagement) q = q.in("action", [...CANDIDATE_MGMT_ACTIONS]);
      const from = (p.page - 1) * p.size;
      const { data, error, count } = await q
        .order("created_at", { ascending: false })
        .range(from, from + p.size - 1);
      if (error) throw new Error("Unable to load activity.");
      const ids = [
        ...new Set(
          (data ?? [])
            .flatMap((r) => [r.user_id, r.target_user_id])
            .filter((x): x is string => !!x),
        ),
      ];
      const names = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        for (const pr of profs ?? []) names.set(pr.id, pr.full_name || pr.email || "Unknown user");
      }
      return { rows: data ?? [], total: count ?? 0, names };
    },
    placeholderData: (prev) => prev,
  });

export function formatDate(v: string | null | undefined, withTime = false) {
  if (!v) return "—";
  const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
  return d.toLocaleString(
    "en-IN",
    withTime
      ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
      : { day: "2-digit", month: "short", year: "numeric" },
  );
}
