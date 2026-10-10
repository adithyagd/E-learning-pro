import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { PageHeader } from "@/layouts/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { cn } from "@/lib/utils";
import {
  CERT_STATUS_CLASS,
  CERT_STATUS_LABEL,
  certificateListQuery,
  fmtDate,
  type CertificateRow,
  type CertificateStatus,
} from "@/features/certificates/certificates";
import {
  approveAndIssueCertificate,
  getCertificateDownload,
  rejectCertificate,
  rereviewCertificate,
  revokeCertificate,
} from "@/features/certificates/certificates.functions";

const FILTERS = ["all", "pending_approval", "approved", "issued", "rejected", "revoked"] as const;
type Filter = (typeof FILTERS)[number];

export const Route = createFileRoute("/_authenticated/admin/certificates/")({
  validateSearch: z.object({ status: z.enum(FILTERS).optional().catch(undefined) }),
  head: () => ({
    meta: [
      { title: "Certifications — E2E Recruiter Academy" },
      { name: "description", content: "Review, approve, issue and revoke Academy certificates." },
      { property: "og:title", content: "Certifications — E2E Recruiter Academy" },
      { property: "og:description", content: "Certificate requests and issued certificates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CertificationsPage,
});

type Action = { kind: "approve" | "reject" | "rereview" | "revoke"; row: CertificateRow };

export function CertStatusBadge({ status }: { status: CertificateStatus | "not_eligible" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        CERT_STATUS_CLASS[status],
      )}
    >
      {CERT_STATUS_LABEL[status]}
    </span>
  );
}

function CertificationsPage() {
  const { status } = Route.useSearch();
  const filter: Filter = status ?? "all";
  const navigate = useNavigate({ from: Route.fullPath });
  const list = useQuery(certificateListQuery());
  const [q, setQ] = useState("");
  const [action, setAction] = useState<Action | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (list.data ?? []).filter(
      (r) =>
        (filter === "all" || r.status === filter) &&
        (!term ||
          [r.full_name, r.email, r.employee_id].some((v) => v?.toLowerCase().includes(term))),
    );
  }, [list.data, filter, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: list.data?.length ?? 0 };
    for (const r of list.data ?? []) c[r.status!] = (c[r.status!] ?? 0) + 1;
    return c;
  }, [list.data]);

  return (
    <>
      <PageHeader
        title="Certifications"
        description="Certificates are issued only after the Final Assessment is passed and an administrator approves the request."
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => navigate({ search: { status: f === "all" ? undefined : f } })}
            >
              {f === "all" ? "All" : CERT_STATUS_LABEL[f]}
              <span className="ml-1 tabular-nums opacity-70">{counts[f] ?? 0}</span>
            </Button>
          ))}
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search name, Candidate ID or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search certificates"
          />
        </div>
      </div>

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState
          description="Certificates could not be loaded."
          onRetry={() => list.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No certificate requests"
          description="Requests appear here automatically when a candidate passes the Final Assessment."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <CertificateCard key={r.id} row={r} onAction={setAction} />
          ))}
        </div>
      )}
      <ActionDialog action={action} onClose={() => setAction(null)} />
    </>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm">{value}</dd>
    </div>
  );
}

function CertificateCard({
  row: r,
  onAction,
}: {
  row: CertificateRow;
  onAction: (a: Action) => void;
}) {
  const download = useServerFn(getCertificateDownload);
  const eligible = r.final_passed && (r.completed_modules ?? 0) >= (r.total_modules ?? 5);
  return (
    <article className="rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{r.full_name || "—"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {r.employee_id ?? "—"} · {r.email}
          </p>
        </div>
        <CertStatusBadge status={r.status!} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Field label="Completed modules" value={`${r.completed_modules}/${r.total_modules}`} />
        <Field
          label="Final Assessment"
          value={
            r.final_score == null
              ? "—"
              : `${Math.round(Number(r.final_score))}% · ${r.final_passed ? "PASS" : "FAIL"}`
          }
        />
        <Field label="Eligibility" value={eligible ? "Eligible" : "Not eligible"} />
        <Field label="Requested" value={fmtDate(r.requested_at)} />
        <Field
          label={r.rejected_at && r.status === "rejected" ? "Rejected" : "Approved"}
          value={fmtDate(r.status === "rejected" ? r.rejected_at : r.approved_at)}
        />
        <Field label="Issued" value={fmtDate(r.issued_at)} />
        <Field label="Certificate ID" value={r.issued_at ? r.certificate_number : "—"} />
        {r.status === "revoked" && <Field label="Revoked" value={fmtDate(r.revoked_at)} />}
      </dl>
      {r.status === "rejected" && r.rejection_reason && (
        <p className="mt-3 rounded-md bg-muted p-2 text-sm">
          Rejection reason: {r.rejection_reason}
        </p>
      )}
      {r.status === "revoked" && r.revocation_reason && (
        <p className="mt-3 rounded-md bg-muted p-2 text-sm">
          Revocation reason: {r.revocation_reason}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {r.status === "pending_approval" && (
          <>
            <Button size="sm" onClick={() => onAction({ kind: "approve", row: r })}>
              Approve & issue
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction({ kind: "reject", row: r })}
            >
              Reject
            </Button>
          </>
        )}
        {r.status === "approved" && (
          <Button size="sm" onClick={() => onAction({ kind: "approve", row: r })}>
            Retry certificate generation
          </Button>
        )}
        {r.status === "rejected" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction({ kind: "rereview", row: r })}
          >
            Re-review
          </Button>
        )}
        {r.status === "issued" && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const res = await download({ data: { certificateId: r.id! } });
                if (res.ok) window.open(res.url, "_blank", "noopener");
                else toast.error(res.error);
              }}
            >
              View PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction({ kind: "revoke", row: r })}
            >
              Revoke
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

const COPY = {
  approve: {
    title: "Approve and issue certificate?",
    body: "Eligibility is re-checked on the server. A PDF certificate is generated and the candidate can download it.",
    cta: "Approve & issue",
  },
  reject: {
    title: "Reject certificate request?",
    body: "The candidate will see the reason.",
    cta: "Reject",
  },
  rereview: {
    title: "Re-review this request?",
    body: "The request returns to Pending approval so it can be approved or rejected again.",
    cta: "Move to pending",
  },
  revoke: {
    title: "Revoke certificate?",
    body: "The certificate will show as revoked on verification and can no longer be downloaded.",
    cta: "Revoke",
  },
};

function ActionDialog({ action, onClose }: { action: Action | null; onClose: () => void }) {
  const qc = useQueryClient();
  const approve = useServerFn(approveAndIssueCertificate);
  const reject = useServerFn(rejectCertificate);
  const rereview = useServerFn(rereviewCertificate);
  const revoke = useServerFn(revokeCertificate);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const needsReason = action?.kind === "reject" || action?.kind === "revoke";
  const c = action ? COPY[action.kind] : null;

  async function run() {
    if (!action) return;
    if (needsReason && reason.trim().length < 3) {
      toast.error("Please enter a reason.");
      return;
    }
    setBusy(true);
    const id = action.row.id!;
    const res =
      action.kind === "approve"
        ? await approve({ data: { certificateId: id } })
        : action.kind === "reject"
          ? await reject({ data: { certificateId: id, reason } })
          : action.kind === "revoke"
            ? await revoke({ data: { certificateId: id, reason } })
            : await rereview({ data: { certificateId: id } });
    setBusy(false);
    await qc.invalidateQueries({ queryKey: ["certificates"] });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(c!.cta + " — done");
    setReason("");
    onClose();
  }

  return (
    <Dialog open={!!action} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{c?.title}</DialogTitle>
          <DialogDescription>
            {action?.row.full_name} ({action?.row.employee_id}). {c?.body}
          </DialogDescription>
        </DialogHeader>
        {needsReason && (
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason (required)</Label>
            <Textarea
              id="reason"
              value={reason}
              maxLength={1000}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={run}
            disabled={busy}
            variant={
              action?.kind === "reject" || action?.kind === "revoke" ? "destructive" : "default"
            }
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {c?.cta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
