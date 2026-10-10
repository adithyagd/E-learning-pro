import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
type E = Database["public"]["Enums"];
export type Requirement = T["job_requirements"]["Row"];
export type RecCandidate = T["recruitment_candidates"]["Row"];
export type Interview = T["recruitment_interviews"]["Row"];
export type RecActivity = T["recruitment_activities"]["Row"];
export type StageHistory = T["recruitment_stage_history"]["Row"];
export type InterviewEvent = T["recruitment_interview_events"]["Row"];
export type Stage = E["recruitment_stage"];
export type ReqStatus = E["requirement_status"];
export type Priority = E["requirement_priority"];
export type InterviewStatus = E["interview_status"];
export type ActivityType = E["recruitment_activity_type"];
export type RecArea = "admin" | "manager" | "candidate";

export const MAIN_STAGES: Stage[] = [
  "sourced",
  "contacted",
  "interested",
  "screened",
  "shortlisted",
  "interview_scheduled",
  "interview_attended",
  "selected",
  "offered",
  "offer_accepted",
  "joined",
];
export const EXTRA_STAGES: Stage[] = [
  "rejected",
  "not_interested",
  "no_response",
  "on_hold",
  "dropout",
  "absconded",
];
export const ALL_STAGES = [...MAIN_STAGES, ...EXTRA_STAGES];
export const STAGE_LABEL: Record<Stage, string> = {
  sourced: "Sourced",
  contacted: "Contacted",
  interested: "Interested",
  screened: "Screened",
  shortlisted: "Shortlisted",
  interview_scheduled: "Interview Scheduled",
  interview_attended: "Interview Attended",
  selected: "Selected",
  offered: "Offered",
  offer_accepted: "Offer Accepted",
  joined: "Joined",
  rejected: "Rejected",
  not_interested: "Not Interested",
  no_response: "No Response",
  on_hold: "On Hold",
  dropout: "Dropout",
  absconded: "Absconded",
};
export const WITHDRAWN: Stage[] = ["rejected", "not_interested", "dropout", "absconded"];

/** Mirrors recruitment_transition_allowed() in the database (which is authoritative). */
export function allowedNext(from: Stage): Stage[] {
  return ALL_STAGES.filter((to) => {
    if (from === to) return false;
    if (WITHDRAWN.includes(from)) return false;
    if (from === "joined") return to === "absconded";
    if (to === "absconded") return from === "offer_accepted";
    const fi = MAIN_STAGES.indexOf(from);
    const ti = MAIN_STAGES.indexOf(to);
    if (ti < 0 || fi < 0) return true;
    return ti > fi;
  });
}

export const REQ_STATUSES: ReqStatus[] = ["draft", "open", "on_hold", "closed", "cancelled"];
export const REQ_STATUS_LABEL: Record<ReqStatus, string> = {
  draft: "Draft",
  open: "Open",
  on_hold: "On Hold",
  closed: "Closed",
  cancelled: "Cancelled",
};
export const PRIORITIES: Priority[] = ["low", "normal", "high", "urgent"];
export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};
export const INTERVIEW_STATUSES: InterviewStatus[] = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "rescheduled",
  "no_show",
];
export const INTERVIEW_LABEL: Record<InterviewStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
  no_show: "No Show",
};
export const ACTIVITY_TYPES: ActivityType[] = [
  "sourced",
  "contacted",
  "screening_completed",
  "interview_scheduled",
  "interview_outcome",
  "shortlisted",
  "rejected",
  "offer_issued",
  "offer_accepted",
  "joined",
  "on_hold",
  "withdrawn",
  "note",
];
export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  sourced: "Candidate sourced",
  contacted: "Candidate contacted",
  screening_completed: "Screening completed",
  interview_scheduled: "Interview scheduled",
  interview_outcome: "Interview outcome recorded",
  shortlisted: "Candidate shortlisted",
  rejected: "Candidate rejected",
  offer_issued: "Offer issued",
  offer_accepted: "Offer accepted",
  joined: "Candidate joined",
  on_hold: "Placed on hold",
  withdrawn: "Candidate withdrew",
  note: "Note",
};

export const SECTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "requirements", label: "Job Requirements" },
  { key: "pipeline", label: "Candidate Pipeline" },
  { key: "candidates", label: "Candidate Profiles" },
  { key: "activity", label: "Recruitment Activity" },
  { key: "reports", label: "Recruitment Reports" },
] as const;
export type SectionKey = (typeof SECTIONS)[number]["key"];
export const isSection = (s: string): s is SectionKey => SECTIONS.some((x) => x.key === s);

export interface RecData {
  requirements: Requirement[];
  candidates: RecCandidate[];
  interviews: Interview[];
  activities: RecActivity[];
  history: StageHistory[];
  teams: { id: string; name: string }[];
  people: Map<string, string>;
}

/** Every query is scoped by RLS to the records the caller is authorised to see. */
export const recruitmentQuery = () =>
  queryOptions({
    queryKey: ["recruitment", "all"],
    queryFn: async (): Promise<RecData> => {
      const [r, c, i, a, h, t] = await Promise.all([
        supabase.from("job_requirements").select("*").order("created_at", { ascending: false }),
        supabase
          .from("recruitment_candidates")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("recruitment_interviews")
          .select("*")
          .order("scheduled_at", { ascending: false }),
        supabase
          .from("recruitment_activities")
          .select("*")
          .order("occurred_at", { ascending: false })
          .limit(1000),
        supabase.from("recruitment_stage_history").select("*").order("changed_at").limit(5000),
        supabase.from("teams").select("id, name").order("name"),
      ]);
      const err = [r, c, i, a, h].find((x) => x.error);
      if (err) throw new Error("Recruitment records could not be loaded.");
      const ids = new Set<string>();
      for (const x of r.data ?? []) {
        if (x.assigned_recruiter_id) ids.add(x.assigned_recruiter_id);
      }
      for (const x of c.data ?? []) if (x.recruiter_id) ids.add(x.recruiter_id);
      for (const x of a.data ?? []) if (x.recorded_by) ids.add(x.recorded_by);
      for (const x of h.data ?? []) if (x.changed_by) ids.add(x.changed_by);
      const people = new Map<string, string>();
      if (ids.size) {
        const { data } = await supabase.rpc("recruitment_people", { _ids: [...ids] });
        for (const p of data ?? []) people.set(p.id, p.full_name ?? "Staff member");
      }
      return {
        requirements: r.data ?? [],
        candidates: c.data ?? [],
        interviews: i.data ?? [],
        activities: a.data ?? [],
        history: h.data ?? [],
        teams: t.data ?? [],
        people,
      };
    },
  });

export const assignableStaffQuery = () =>
  queryOptions({
    queryKey: ["recruitment", "staff"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("recruitment_assignable_staff");
      if (error) throw new Error("Staff list could not be loaded.");
      return data ?? [];
    },
  });

/** datetime-local value interpreted in India time (the app's time zone). */
export const istInputToIso = (v: string) => (v ? new Date(`${v}:00+05:30`).toISOString() : "");
export const isoToIstInput = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 330 * 60000);
  return d.toISOString().slice(0, 16);
};
export const splitList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export function inRange(iso: string, from: string, to: string) {
  const d = isoToIstInput(iso).slice(0, 10);
  return (!from || d >= from) && (!to || d <= to);
}
export const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 1000) / 10}%` : "—");
