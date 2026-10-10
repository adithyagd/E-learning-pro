import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type Result = { ok: true } | { ok: false; error: string };

const DB_ERRORS: Record<string, string> = {
  Forbidden: "Only administrators can do this.",
  "Cannot approve own certificate": "You cannot approve your own certificate.",
  "Certificate is not pending approval": "This request is no longer pending approval.",
  "Candidate is not eligible":
    "The candidate is not eligible: all modules and the Final Assessment must be passed.",
  "Certificate is not approved": "This certificate is not in the approved state.",
  "Certificate is not rejected": "Only rejected requests can be re-reviewed.",
  "Certificate is not issued": "Only issued certificates can be revoked.",
  "A reason is required": "A reason is required.",
  "Certificate not found": "Certificate not found.",
};
const friendly = (m?: string) => (m && DB_ERRORS[m]) || "The action could not be completed.";

/**
 * Approve (if pending) and issue: generates the PDF, stores it privately, then marks ISSUED.
 * If PDF generation or storage fails the record stays APPROVED and the call can be retried.
 */
export const approveAndIssueCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ certificateId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<Result> => {
    const { data: cert, error } = await context.supabase.rpc("approve_certificate", {
      _cert: data.certificateId,
    });
    if (error || !cert) return { ok: false, error: friendly(error?.message) };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { renderCertificatePdf } = await import("./certificate-pdf.server");
    try {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", cert.candidate_id)
        .single();
      const { canonicalAppUrl } = await import("@/lib/app-url.server");
      const appUrl = canonicalAppUrl();
      const issuedAt = new Date();
      const bytes = await renderCertificatePdf({
        candidateName: prof?.full_name || "Candidate",
        certificateNumber: cert.certificate_number,
        program: cert.program,
        issuedAt,
        scorePercent: cert.final_score == null ? null : Number(cert.final_score),
        issuerName: cert.issuer_name,
        verifyUrl: appUrl ? `${appUrl}/verify/${cert.certificate_number}` : null,
      });
      const path = `${cert.candidate_id}/${cert.certificate_number}.pdf`;
      const up = await supabaseAdmin.storage
        .from("certificates")
        .upload(path, bytes, { contentType: "application/pdf", upsert: true });
      if (up.error) throw new Error("storage");
      const { error: issueErr } = await context.supabase.rpc("mark_certificate_issued", {
        _cert: cert.id,
        _path: path,
      });
      if (issueErr) throw new Error("issue");
      return { ok: true };
    } catch {
      return {
        ok: false,
        error:
          "Approved, but the certificate PDF could not be generated or saved. It has not been issued — please retry.",
      };
    }
  });

const reasonInput = z.object({
  certificateId: z.string().uuid(),
  reason: z.string().trim().min(3).max(1000),
});

export const rejectCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => reasonInput.parse(i))
  .handler(async ({ data, context }): Promise<Result> => {
    const { error } = await context.supabase.rpc("reject_certificate", {
      _cert: data.certificateId,
      _reason: data.reason,
    });
    return error ? { ok: false, error: friendly(error.message) } : { ok: true };
  });

export const revokeCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => reasonInput.parse(i))
  .handler(async ({ data, context }): Promise<Result> => {
    const { error } = await context.supabase.rpc("revoke_certificate", {
      _cert: data.certificateId,
      _reason: data.reason,
    });
    return error ? { ok: false, error: friendly(error.message) } : { ok: true };
  });

export const rereviewCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ certificateId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<Result> => {
    const { error } = await context.supabase.rpc("rereview_certificate", {
      _cert: data.certificateId,
    });
    return error ? { ok: false, error: friendly(error.message) } : { ok: true };
  });

/** Short-lived download link; RLS decides whether the caller may see the record at all. */
export const getCertificateDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ certificateId: z.string().uuid() }).parse(i))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; url: string } | { ok: false; error: string }> => {
      const { data: cert } = await context.supabase
        .from("certificates")
        .select("id, candidate_id, certificate_number, status, pdf_path")
        .eq("id", data.certificateId)
        .maybeSingle();
      if (!cert) return { ok: false, error: "Certificate not found." };
      if (cert.status === "revoked")
        return { ok: false, error: "This certificate has been revoked and is no longer valid." };
      if (cert.status !== "issued" || !cert.pdf_path)
        return { ok: false, error: "This certificate has not been issued." };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed, error } = await supabaseAdmin.storage
        .from("certificates")
        .createSignedUrl(cert.pdf_path, 120, { download: `${cert.certificate_number}.pdf` });
      if (error || !signed)
        return { ok: false, error: "The certificate file could not be opened." };
      await supabaseAdmin.from("activity_logs").insert({
        user_id: context.userId,
        action: "certificate_downloaded",
        target_user_id: cert.candidate_id,
        metadata: { certificate_number: cert.certificate_number },
      });
      return { ok: true, url: signed.signedUrl };
    },
  );

/** Public verification: returns only certificate ID, name, program, issue date and validity. */
export const verifyCertificate = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ number: z.string().trim().min(4).max(64) }).parse(i))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
            h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: res } = await client.rpc("verify_certificate", { _number: data.number });
    return (res ?? null) as null | {
      certificate_number: string;
      candidate_name: string | null;
      program: string;
      issued_at: string;
      status: "valid" | "revoked";
    };
  });
