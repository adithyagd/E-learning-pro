import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type OverviewRow = Database["public"]["Functions"]["academy_overview"]["Returns"][number];
export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type LessonProgress = Database["public"]["Tables"]["lesson_progress"]["Row"];
export type ModuleState = "locked" | "not_started" | "in_progress" | "completed";
export type ModuleOverview = Omit<OverviewRow, "state"> & { state: ModuleState };
export type LessonContentType = Database["public"]["Enums"]["lesson_content_type"];

export const MODULE_STATE_LABEL: Record<ModuleState, string> = {
  locked: "Locked",
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};
export const CONTENT_TYPE_LABEL: Record<LessonContentType, string> = {
  text: "Reading",
  video: "Video",
  document: "Document",
  scenario: "Scenario",
  practice: "Practice",
  quiz: "Quiz",
};

export const overviewQuery = (candidateId: string) =>
  queryOptions({
    queryKey: ["academy", "overview", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("academy_overview", { _candidate: candidateId });
      if (error) throw new Error("Unable to load academy progress.");
      return (data ?? []).map((m): ModuleOverview => ({ ...m, state: m.state as ModuleState }));
    },
  });

/** Lessons are only returned by the database for modules the candidate has unlocked. */
export const lessonsQuery = (moduleId: string) =>
  queryOptions({
    queryKey: ["academy", "lessons", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("module_id", moduleId)
        .eq("status", "active")
        .order("sort_order");
      if (error) throw new Error("Unable to load lessons.");
      return data ?? [];
    },
  });

export const lessonProgressQuery = (candidateId: string, moduleId: string) =>
  queryOptions({
    queryKey: ["academy", "lesson-progress", candidateId, moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("candidate_id", candidateId)
        .eq("module_id", moduleId);
      if (error) throw new Error("Unable to load lesson progress.");
      return new Map((data ?? []).map((p) => [p.lesson_id, p]));
    },
  });

export const recentLearningQuery = (candidateId: string) =>
  queryOptions({
    queryKey: ["academy", "recent", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, action, module_id, lesson_id, created_at")
        .eq("user_id", candidateId)
        .in("action", [
          "module_opened",
          "lesson_opened",
          "module_started",
          "lesson_started",
          "lesson_completed",
          "module_completed",
        ])
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw new Error("Unable to load recent activity.");
      return data ?? [];
    },
  });

/** Final assessment opens only after every active module is completed. */
export function finalAssessmentState(modules: ModuleOverview[]): "locked" | "available" {
  return modules.length > 0 && modules.every((m) => m.state === "completed")
    ? "available"
    : "locked";
}

export function overallProgress(modules: ModuleOverview[]) {
  if (!modules.length) return 0;
  return Math.min(100, modules.reduce((s, m) => s + Number(m.percentage ?? 0), 0) / modules.length);
}

export function currentModule(modules: ModuleOverview[]) {
  return (
    modules.find((m) => m.state === "in_progress") ??
    modules.find((m) => m.state === "not_started") ??
    null
  );
}

export function moduleStatusDetail(m: ModuleOverview) {
  if (m.state === "locked") return "Complete the previous module to unlock";
  if (m.lessons_completed && m.requires_assessment && !m.assessment_passed)
    return `Assessment pending · pass mark ${m.pass_mark}%`;
  if (m.total_lessons === 0) return "Lessons will be added soon";
  return `${m.completed_lessons} of ${m.total_lessons} lessons completed`;
}
