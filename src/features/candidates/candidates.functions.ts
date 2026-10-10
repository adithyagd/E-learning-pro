import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createCandidateSchema, statusActionSchema, updateCandidateSchema } from "./schema";

type Ctx = {
  supabase: {
    rpc: (
      fn: "has_role",
      args: { _user_id: string; _role: "admin" },
    ) => PromiseLike<{ data: boolean | null }>;
  };
  userId: string;
};

const LINK_ORIGIN_ERROR =
  "Invitation not sent: the app has no public address yet. Set the public app URL (APP_PUBLIC_URL) first — links to the private editor preview cannot be opened by candidates.";

/** Verifies the caller is an admin via their own RLS-scoped client, then returns the privileged client. */

async function requireAdmin(context: Ctx) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type Admin = Awaited<ReturnType<typeof requireAdmin>>;
type Action =
  | "candidate_created"
  | "candidate_updated"
  | "candidate_activated"
  | "candidate_suspended"
  | "candidate_disabled"
  | "candidate_reenabled"
  | "candidate_invited"
  | "candidate_viewed";

async function audit(
  admin: Admin,
  actorId: string,
  action: Action,
  targetId: string,
  metadata: Record<string, unknown> = {},
) {
  await admin.from("activity_logs").insert({
    user_id: actorId,
    role: "admin",
    action,
    target_user_id: targetId,
    metadata: metadata as never,
  });
}

type Result =
  | { ok: true; userId?: string; inviteSent?: boolean; message?: string }
  | { ok: false; error: string; field?: string };

export const createCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createCandidateSchema.parse(input))
  .handler(async ({ data, context }): Promise<Result> => {
    const admin = await requireAdmin(context);

    // Duplicate checks (also enforced by unique indexes).
    const [byEmail, byCid, byEmp] = await Promise.all([
      admin.from("profiles").select("id").ilike("email", data.email).maybeSingle(),
      admin
        .from("candidate_profiles")
        .select("user_id")
        .ilike("employee_id", data.candidateId)
        .maybeSingle(),
      data.hrEmployeeId
        ? admin
            .from("candidate_profiles")
            .select("user_id")
            .ilike("hr_employee_id", data.hrEmployeeId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (byEmail.data)
      return { ok: false, field: "email", error: "An account with this email already exists." };
    if (byCid.data)
      return { ok: false, field: "candidateId", error: "This Candidate ID is already in use." };
    if (byEmp.data)
      return { ok: false, field: "hrEmployeeId", error: "This Employee ID is already in use." };

    // Create the auth account through an invitation (candidate sets their own password).
    const { emailLinkOrigin } = await import("@/lib/app-url.server");
    const linkOrigin = emailLinkOrigin(data.redirectOrigin);
    if (!linkOrigin) return { ok: false, error: LINK_ORIGIN_ERROR };
    const redirectTo = `${linkOrigin}/reset-password`;
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      data.email,
      {
        redirectTo,
        data: { full_name: data.fullName },
      },
    );
    if (inviteErr || !invited.user) {
      console.error("invite failed", inviteErr?.message);
      return {
        ok: false,
        error:
          "The account could not be created because the invitation email could not be sent. Please try again later.",
      };
    }
    const uid = invited.user.id;

    const rollback = async () => {
      await admin.auth.admin.deleteUser(uid);
    };
    const { error: pErr } = await admin
      .from("profiles")
      .update({ full_name: data.fullName, phone: data.phone, account_status: data.accountStatus })
      .eq("id", uid);
    const { error: rErr } = await admin
      .from("user_roles")
      .insert({ user_id: uid, role: "candidate" });
    const { error: cErr } = await admin.from("candidate_profiles").insert({
      user_id: uid,
      employee_id: data.candidateId,
      hr_employee_id: data.hrEmployeeId,
      location: data.location,
      joining_date: data.joiningDate,
      department: data.department,
      designation: data.designation,
      academy_status: data.academyStatus,
    });
    if (pErr || rErr || cErr) {
      console.error("candidate create failed", pErr?.message, rErr?.message, cErr?.message);
      await rollback();
      return {
        ok: false,
        error: "The candidate could not be created. Please check the details and try again.",
      };
    }

    await audit(admin, context.userId, "candidate_created", uid, {
      candidate_id: data.candidateId,
      account_status: data.accountStatus,
    });
    await audit(admin, context.userId, "candidate_invited", uid, { channel: "email" });
    return { ok: true, userId: uid, inviteSent: true };
  });

export const updateCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateCandidateSchema.parse(input))
  .handler(async ({ data, context }): Promise<Result> => {
    const admin = await requireAdmin(context);
    const { data: dupCid } = await admin
      .from("candidate_profiles")
      .select("user_id")
      .ilike("employee_id", data.candidateId)
      .neq("user_id", data.userId)
      .maybeSingle();
    if (dupCid)
      return { ok: false, field: "candidateId", error: "This Candidate ID is already in use." };
    if (data.hrEmployeeId) {
      const { data: dupEmp } = await admin
        .from("candidate_profiles")
        .select("user_id")
        .ilike("hr_employee_id", data.hrEmployeeId)
        .neq("user_id", data.userId)
        .maybeSingle();
      if (dupEmp)
        return { ok: false, field: "hrEmployeeId", error: "This Employee ID is already in use." };
    }
    const { data: before } = await admin
      .from("candidate_directory")
      .select("*")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!before) return { ok: false, error: "Candidate not found." };

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      admin
        .from("profiles")
        .update({ full_name: data.fullName, phone: data.phone })
        .eq("id", data.userId),
      admin
        .from("candidate_profiles")
        .update({
          employee_id: data.candidateId,
          hr_employee_id: data.hrEmployeeId,
          location: data.location,
          joining_date: data.joiningDate,
          department: data.department,
          designation: data.designation,
          academy_status: data.academyStatus,
        })
        .eq("user_id", data.userId),
    ]);
    if (e1 || e2) return { ok: false, error: "Changes could not be saved. Please try again." };

    const after: Record<string, unknown> = {
      full_name: data.fullName,
      candidate_id: data.candidateId,
      hr_employee_id: data.hrEmployeeId,
      phone: data.phone,
      location: data.location,
      joining_date: data.joiningDate,
      department: data.department,
      designation: data.designation,
      academy_status: data.academyStatus,
    };
    const changed = Object.keys(after).filter(
      (k) => (before as Record<string, unknown>)[k] !== after[k],
    );
    await audit(admin, context.userId, "candidate_updated", data.userId, {
      changed_fields: changed,
    });
    return { ok: true };
  });

const STATUS_TRANSITIONS = {
  activate: { from: ["invited"], to: "active", log: "candidate_activated" },
  suspend: { from: ["active", "invited"], to: "suspended", log: "candidate_suspended" },
  disable: { from: ["active", "invited", "suspended"], to: "disabled", log: "candidate_disabled" },
  reenable: { from: ["suspended", "disabled"], to: "active", log: "candidate_reenabled" },
} as const;

export const setCandidateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => statusActionSchema.parse(input))
  .handler(async ({ data, context }): Promise<Result> => {
    const admin = await requireAdmin(context);
    const t = STATUS_TRANSITIONS[data.action];
    const { data: isCandidate } = await admin
      .from("candidate_profiles")
      .select("user_id")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!isCandidate) return { ok: false, error: "Candidate not found." };
    const { data: prof } = await admin
      .from("profiles")
      .select("account_status")
      .eq("id", data.userId)
      .maybeSingle();
    const from = prof?.account_status;
    if (!from || !(t.from as readonly string[]).includes(from))
      return { ok: false, error: "This status change is not allowed from the current status." };
    const { error } = await admin
      .from("profiles")
      .update({ account_status: t.to })
      .eq("id", data.userId);
    if (error) return { ok: false, error: "Status could not be updated. Please try again." };
    // Suspended/disabled users lose any active sessions immediately.
    if (t.to !== "active") await admin.auth.admin.signOut(data.userId, "global").catch(() => {});
    await audit(admin, context.userId, t.log, data.userId, { from, to: t.to });
    return { ok: true };
  });

export const resendInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), redirectOrigin: z.string().url().max(500) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<Result> => {
    const admin = await requireAdmin(context);
    const { data: prof } = await admin
      .from("profiles")
      .select("email, account_status")
      .eq("id", data.userId)
      .maybeSingle();
    if (!prof?.email) return { ok: false, error: "Candidate not found." };
    if (prof.account_status !== "invited")
      return { ok: false, error: "Invitations can only be resent to invited accounts." };
    const { emailLinkOrigin } = await import("@/lib/app-url.server");
    const linkOrigin = emailLinkOrigin(data.redirectOrigin);
    if (!linkOrigin) return { ok: false, error: LINK_ORIGIN_ERROR };
    const { error } = await admin.auth.resetPasswordForEmail(prof.email, {
      redirectTo: `${linkOrigin}/reset-password`,
    });
    if (error)
      return { ok: false, error: "The invitation could not be sent. Please try again later." };
    await audit(admin, context.userId, "candidate_invited", data.userId, {
      channel: "email",
      resend: true,
    });
    return { ok: true };
  });

export const recordCandidateViewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context);
    await audit(admin, context.userId, "candidate_viewed", data.userId);
    return { ok: true };
  });

/** Called after an invited user sets their password: activates their own invited account. */
export const completeInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("account_status")
      .eq("id", context.userId)
      .maybeSingle();
    if (prof?.account_status !== "invited") return { activated: false };
    await supabaseAdmin
      .from("profiles")
      .update({ account_status: "active" })
      .eq("id", context.userId);
    await supabaseAdmin.from("activity_logs").insert({
      user_id: context.userId,
      role: "candidate",
      action: "candidate_activated",
      target_user_id: context.userId,
      metadata: { via: "invitation_accepted" },
    });
    return { activated: true };
  });
