import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CertificateStatus = Database["public"]["Enums"]["certificate_status"];
export type CertificateRow = Database["public"]["Views"]["certificate_directory"]["Row"];

export const CERT_STATUS_LABEL: Record<CertificateStatus | "not_eligible", string> = {
  not_eligible: "Not eligible",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  issued: "Issued",
  revoked: "Revoked",
};

export const CERT_STATUS_CLASS: Record<CertificateStatus | "not_eligible", string> = {
  not_eligible: "border-border bg-muted text-muted-foreground",
  pending_approval: "border-warning/30 bg-warning/10 text-warning",
  approved: "border-info/30 bg-info/10 text-info",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  issued: "border-success/30 bg-success/10 text-success",
  revoked: "border-destructive/30 bg-destructive/10 text-destructive",
};

/** RLS limits rows: candidates see their own, admins all, trainers/managers permitted candidates. */
export const certificateListQuery = () =>
  queryOptions({
    queryKey: ["certificates", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificate_directory")
        .select("*")
        .order("requested_at", { ascending: false });
      if (error) throw new Error("Certificates could not be loaded.");
      return data ?? [];
    },
  });

export const myCertificateQuery = (candidateId: string) =>
  queryOptions({
    queryKey: ["certificates", "mine", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select(
          "id, certificate_number, program, status, final_score, requested_at, approved_at, rejected_at, issued_at, revoked_at, rejection_reason, revocation_reason",
        )
        .eq("candidate_id", candidateId)
        .maybeSingle();
      if (error) throw new Error("Certificate status could not be loaded.");
      return data;
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
