import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ActivityAction, AppRole } from "./roles";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export const GENERIC_ERROR = "Invalid credentials. Please check your details and try again.";
export const STATUS_MESSAGE: Record<string, string> = {
  invited:
    "Your account has not been activated yet. Please use the invitation sent to you or contact your administrator.",
  suspended: "Your account is suspended. Please contact your administrator.",
  disabled: "Your account has been disabled. Please contact your administrator.",
};

export async function getAdmin(): Promise<Admin> {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

export function publicClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export async function writeLog(
  admin: Admin,
  userId: string,
  action: ActivityAction,
  role: AppRole | null,
  metadata: Record<string, unknown> = {},
) {
  await admin
    .from("activity_logs")
    .insert({ user_id: userId, action, role, metadata: metadata as never });
}

export async function findUserIdByEmail(admin: Admin, email: string): Promise<string | null> {
  const { data } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
  return data?.id ?? null;
}

export type SignInResult =
  | { ok: true; access_token: string; refresh_token: string; redirectTo: string }
  | { ok: false; error: string };

/**
 * Shared server-side sign-in: authenticates, then enforces role scope and account status
 * before releasing tokens. All outcomes are audit-logged when the user is identifiable.
 */
export async function signInAndAuthorize(opts: {
  admin: Admin;
  userId: string | null;
  email: string;
  password: string;
  allowed: AppRole[];
  portal: "recruiter" | "staff";
  wrongPortalMessage: string;
}): Promise<SignInResult> {
  const { admin, userId, email, password, allowed, portal } = opts;
  const client = publicClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    if (userId)
      await writeLog(admin, userId, "login_failed", null, {
        portal,
        reason: "invalid_credentials",
      });
    return { ok: false, error: GENERIC_ERROR };
  }
  const uid = data.user.id;
  const [{ data: roleRows }, { data: profile }] = await Promise.all([
    admin.from("user_roles").select("role").eq("user_id", uid),
    admin.from("profiles").select("account_status").eq("id", uid).maybeSingle(),
  ]);
  const roles = (roleRows ?? []).map((r) => r.role);
  const primary = roles[0] ?? null;
  const deny = async (reason: string, message: string) => {
    await client.auth.signOut();
    await writeLog(
      admin,
      uid,
      reason === "wrong_portal" ? "access_denied" : "login_failed",
      primary,
      { portal, reason },
    );
    return { ok: false as const, error: message };
  };
  if (!roles.some((r) => allowed.includes(r))) return deny("wrong_portal", opts.wrongPortalMessage);
  const status = profile?.account_status ?? "active";
  if (status !== "active") return deny(`status_${status}`, STATUS_MESSAGE[status] ?? GENERIC_ERROR);

  await admin.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", uid);
  await writeLog(admin, uid, "login", primary, { portal });
  const { homeForRoles } = await import("./roles");
  return {
    ok: true,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    redirectTo: homeForRoles(roles.filter((r) => allowed.includes(r))),
  };
}
