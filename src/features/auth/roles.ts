import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type ActivityAction = Database["public"]["Enums"]["activity_action"];

export const STAFF_ROLES: AppRole[] = ["admin", "trainer", "manager"];

/** Landing page for each role, in priority order. */
export function homeForRoles(roles: AppRole[]): string {
  if (roles.includes("admin")) return "/admin/dashboard";
  if (roles.includes("manager")) return "/manager/dashboard";
  if (roles.includes("trainer")) return "/trainer/dashboard";
  if (roles.includes("candidate")) return "/recruiter/dashboard";
  return "/unauthorized";
}

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrator",
  trainer: "Trainer",
  manager: "Manager",
  candidate: "Recruiter",
};

/** Safe same-origin relative redirect target. */
export function safeRedirect(target: unknown): string | undefined {
  return typeof target === "string" && target.startsWith("/") && !target.startsWith("//")
    ? target
    : undefined;
}
