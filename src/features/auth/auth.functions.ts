import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const credentials = z.object({
  identifier: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(200),
});

/** Recruiter/candidate sign-in by Candidate/Employee ID or email. Lookups stay server-side. */
export const recruiterSignIn = createServerFn({ method: "POST" })
  .inputValidator((input) => credentials.parse(input))
  .handler(async ({ data }) => {
    const { getAdmin, signInAndAuthorize, findUserIdByEmail, GENERIC_ERROR } =
      await import("./auth.server");
    const admin = await getAdmin();
    let email = data.identifier;
    let userId: string | null = null;
    if (email.includes("@")) {
      userId = await findUserIdByEmail(admin, email);
    } else {
      const { data: byCid } = await admin
        .from("candidate_profiles")
        .select("user_id")
        .ilike("employee_id", data.identifier)
        .maybeSingle();
      const cp =
        byCid ??
        (
          await admin
            .from("candidate_profiles")
            .select("user_id")
            .ilike("hr_employee_id", data.identifier)
            .maybeSingle()
        ).data;
      if (!cp) return { ok: false as const, error: GENERIC_ERROR };
      const { data: prof } = await admin
        .from("profiles")
        .select("email")
        .eq("id", cp.user_id)
        .maybeSingle();
      if (!prof?.email) return { ok: false as const, error: GENERIC_ERROR };
      email = prof.email;
      userId = cp.user_id;
    }
    return signInAndAuthorize({
      admin,
      userId,
      email,
      password: data.password,
      allowed: ["candidate"],
      portal: "recruiter",
      wrongPortalMessage:
        "This sign-in is for recruiters and candidates. Staff should use the staff sign-in.",
    });
  });

/** Staff sign-in (admin, trainer, manager). */
export const staffSignIn = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ email: z.string().trim().email().max(255), password: z.string().min(1).max(200) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { getAdmin, signInAndAuthorize, findUserIdByEmail } = await import("./auth.server");
    const admin = await getAdmin();
    const userId = await findUserIdByEmail(admin, data.email);
    return signInAndAuthorize({
      admin,
      userId,
      email: data.email,
      password: data.password,
      allowed: ["admin", "trainer", "manager"],
      portal: "staff",
      wrongPortalMessage: "This account does not have staff access.",
    });
  });

/** Sends a reset link. Always returns the same response to avoid account enumeration. */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ email: z.string().trim().email().max(255), redirectTo: z.string().url().max(500) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { getAdmin, publicClient, findUserIdByEmail, writeLog } = await import("./auth.server");
    const { emailLinkOrigin } = await import("@/lib/app-url.server");
    const linkOrigin = emailLinkOrigin(data.redirectTo);
    if (!linkOrigin) return { ok: true as const };
    const redirectTo = `${linkOrigin}/reset-password`;
    const admin = await getAdmin();
    const userId = await findUserIdByEmail(admin, data.email);
    if (userId) {
      await publicClient().auth.resetPasswordForEmail(data.email, { redirectTo });
      await writeLog(admin, userId, "password_reset_requested", null, {});
    }
    return { ok: true as const };
  });
