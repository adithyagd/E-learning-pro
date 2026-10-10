import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { ActivityAction, AppRole } from "./roles";

export type AccountStatus = Database["public"]["Enums"]["account_status"];

export interface SessionInfo {
  userId: string;
  email: string | null;
  fullName: string | null;
  roles: AppRole[];
  accountStatus: AccountStatus;
}

/**
 * Validates the session with the auth server (getUser) and loads roles from the
 * protected user_roles table. Returns null for missing or expired sessions.
 */
export async function loadSessionInfo(): Promise<SessionInfo | null> {
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user) return null;
  const [{ data: roles }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("profiles").select("full_name, account_status").eq("id", user.id).maybeSingle(),
  ]);
  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name || null,
    roles: (roles ?? []).map((r) => r.role),
    accountStatus: profile?.account_status ?? "active",
  };
}

type SelfAction = Extract<
  ActivityAction,
  | "login"
  | "logout"
  | "module_opened"
  | "lesson_opened"
  | "learning_time"
  | "password_changed"
  | "access_denied"
>;

/** Writes a self-reported activity event for the signed-in user (allowed actions enforced by RLS). */
export async function logActivity(
  action: SelfAction,
  extra: {
    module_id?: string;
    lesson_id?: string;
    role?: AppRole;
    metadata?: Record<string, unknown>;
  } = {},
) {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return;
  await supabase
    .from("activity_logs")
    .insert({ user_id: uid, action, ...extra, metadata: (extra.metadata ?? {}) as never });
}
