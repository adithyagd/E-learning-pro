import { useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Lock,
  Mail,
  Pencil,
  PauseCircle,
  RotateCcw,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/layouts/AppShell";
import { ConfirmationDialog, ErrorState, LoadingState, NotFoundState } from "@/components/states";
import { PerformanceBar } from "@/components/performance/PerformanceBadge";
import { AccountStatusBadge, AcademyStatusBadge } from "@/features/candidates/StatusBadges";
import { ActivityList } from "@/features/candidates/ActivityList";
import { CandidateForm } from "@/features/candidates/CandidateForm";
import { candidateQuery, formatDate } from "@/features/candidates/queries";
import {
  recordCandidateViewed,
  resendInvitation,
  setCandidateStatus,
  updateCandidate,
} from "@/features/candidates/candidates.functions";
import type { StatusAction } from "@/features/candidates/schema";
import { ModuleStateBadge } from "@/features/academy/components";
import { finalAssessmentState, overviewQuery } from "@/features/academy/academy";

export const Route = createFileRoute("/_authenticated/admin/candidates/$candidateId")({
  params: {
    parse: (p) => ({ candidateId: z.string().uuid().catch("invalid").parse(p.candidateId) }),
  },
  head: () => ({
    meta: [
      { title: "Candidate Profile — E2E Recruiter Academy" },
      { name: "description", content: "Candidate details, academy status and activity." },
      { property: "og:title", content: "Candidate Profile — E2E Recruiter Academy" },
      { property: "og:description", content: "Candidate details, academy status and activity." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CandidateProfile,
});

const ACTIONS: Record<
  StatusAction,
  {
    label: string;
    title: string;
    description: string;
    destructive?: boolean;
    icon: typeof Ban;
    success: string;
  }
> = {
  activate: {
    label: "Activate",
    title: "Activate this candidate account?",
    description: "The candidate will be able to sign in immediately.",
    icon: CheckCircle2,
    success: "Account activated",
  },
  suspend: {
    label: "Suspend",
    title: "Suspend this candidate account?",
    description: "The candidate will be signed out and cannot sign in until re-enabled.",
    destructive: true,
    icon: PauseCircle,
    success: "Account suspended",
  },
  disable: {
    label: "Disable",
    title: "Disable this candidate account?",
    description:
      "The candidate will be signed out and the account deactivated. Records are kept and it can be re-enabled later.",
    destructive: true,
    icon: Ban,
    success: "Account disabled",
  },
  reenable: {
    label: "Re-enable",
    title: "Re-enable this candidate account?",
    description: "The account will return to Active and the candidate can sign in again.",
    icon: RotateCcw,
    success: "Account re-enabled",
  },
};
const AVAILABLE: Record<string, StatusAction[]> = {
  invited: ["activate", "suspend", "disable"],
  active: ["suspend", "disable"],
  suspended: ["reenable", "disable"],
  disabled: ["reenable"],
};

/** Real per-module state from the academy read model. */
function AcademyStages({ candidateId }: { candidateId: string }) {
  const q = useQuery(overviewQuery(candidateId));
  if (q.isPending) return <LoadingState label="Loading academy progress…" />;
  if (q.isError)
    return (
      <ErrorState description="Academy progress could not be loaded." onRetry={() => q.refetch()} />
    );
  const finalLocked = finalAssessmentState(q.data) === "locked";
  return (
    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {q.data.map((m) => (
        <li
          key={m.module_id}
          className="flex items-center justify-between gap-2 rounded-sm border px-3 py-2 text-sm"
        >
          <span className="min-w-0 truncate" title={m.title}>
            Module {m.module_number}
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">
              {Math.round(Number(m.percentage))}%
            </span>
            <ModuleStateBadge state={m.state} />
          </span>
        </li>
      ))}
      <li className="flex items-center justify-between rounded-sm border px-3 py-2 text-sm">
        <span>Final Assessment</span>
        {finalLocked ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="size-3" aria-hidden /> Locked
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Not started</span>
        )}
      </li>
      <li className="flex items-center justify-between rounded-sm border px-3 py-2 text-sm">
        <span>Certificate</span>
        <span className="text-xs text-muted-foreground">Not available</span>
      </li>
    </ol>
  );
}

function CandidateProfile() {
  const { candidateId } = Route.useParams();
  const valid = candidateId !== "invalid";
  const q = useQuery({ ...candidateQuery(candidateId), enabled: valid });
  const qc = useQueryClient();
  const viewed = useServerFn(recordCandidateViewed);
  const changeStatus = useServerFn(setCandidateStatus);
  const update = useServerFn(updateCandidate);
  const resend = useServerFn(resendInvitation);
  const [confirm, setConfirm] = useState<StatusAction | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const logged = useRef(false);

  useEffect(() => {
    if (q.data && !logged.current) {
      logged.current = true;
      void viewed({ data: { userId: candidateId } }).catch(() => {});
    }
  }, [q.data, candidateId, viewed]);

  if (!valid) return <NotFoundState />;
  if (q.isPending) return <LoadingState label="Loading candidate…" />;
  if (q.isError)
    return (
      <ErrorState description="The candidate could not be loaded." onRetry={() => q.refetch()} />
    );
  const c = q.data;
  if (!c) return <NotFoundState />;

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["candidates"] }),
      qc.invalidateQueries({ queryKey: ["activity"] }),
    ]);

  async function runStatus(action: StatusAction) {
    setBusy(true);
    try {
      const res = await changeStatus({ data: { userId: candidateId, action } });
      if (res.ok) {
        toast.success(ACTIONS[action].success);
        await refresh();
      } else toast.error(res.error);
    } catch {
      toast.error("Status could not be updated. Please try again.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function runResend() {
    setBusy(true);
    try {
      const res = await resend({
        data: { userId: candidateId, redirectOrigin: window.location.origin },
      });
      if (res.ok) {
        toast.success("Invitation resent", { description: `Sent to ${c!.email}.` });
        await refresh();
      } else toast.error(res.error);
    } catch {
      toast.error("The invitation could not be sent. Please try again later.");
    } finally {
      setBusy(false);
    }
  }

  const status = c.account_status ?? "invited";

  return (
    <>
      <Link
        to="/admin/candidates"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> All candidates
      </Link>
      <PageHeader
        title={c.full_name || "Candidate"}
        description={`${c.candidate_id} · ${c.email ?? ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={busy}>
              <Pencil className="size-4" aria-hidden /> Edit
            </Button>
            {status === "invited" && (
              <Button variant="outline" size="sm" onClick={runResend} disabled={busy}>
                <Mail className="size-4" aria-hidden /> Resend invitation
              </Button>
            )}
            {AVAILABLE[status]?.map((a) => {
              const A = ACTIONS[a];
              return (
                <Button
                  key={a}
                  size="sm"
                  variant={A.destructive ? "outline" : "default"}
                  onClick={() => setConfirm(a)}
                  disabled={busy}
                  className={A.destructive ? "text-destructive hover:text-destructive" : undefined}
                >
                  <A.icon className="size-4" aria-hidden /> {A.label}
                </Button>
              );
            })}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Basic information" className="lg:col-span-2">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Item label="Name">{c.full_name || "—"}</Item>
            <Item label="Candidate ID">
              <span className="font-mono text-sm">{c.candidate_id}</span>
            </Item>
            <Item label="Employee ID">{c.hr_employee_id || "—"}</Item>
            <Item label="Email">{c.email}</Item>
            <Item label="Phone">{c.phone || "—"}</Item>
            <Item label="Location">{c.location || "—"}</Item>
            <Item label="Department">{c.department || "—"}</Item>
            <Item label="Designation">{c.designation || "—"}</Item>
            <Item label="Joining date">{formatDate(c.joining_date)}</Item>
            <Item label="Account status">
              <AccountStatusBadge status={status} />
            </Item>
          </dl>
        </Panel>

        <Panel title="Account information">
          <dl className="space-y-4">
            <Item label="Account created">{formatDate(c.created_at, true)}</Item>
            <Item label="Last login">
              {c.last_login_at ? formatDate(c.last_login_at, true) : "Never"}
            </Item>
            <Item label="Account status">
              <AccountStatusBadge status={status} />
            </Item>
            <Item label="Academy status">
              {c.academy_status && <AcademyStatusBadge status={c.academy_status} />}
            </Item>
          </dl>
          {status === "invited" && (
            <p className="mt-4 rounded-sm border border-info/30 bg-info/10 p-3 text-xs text-info">
              Waiting for the candidate to accept the invitation and set a password.
            </p>
          )}
        </Panel>

        <Panel title="Academy status" className="lg:col-span-3">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Overall progress</span>
            <PerformanceBar value={Number(c.progress_percent ?? 0)} className="max-w-xs" />
            <span className="text-sm tabular-nums">
              {Math.round(Number(c.progress_percent ?? 0))}%
            </span>
          </div>
          <AcademyStages candidateId={candidateId} />
        </Panel>

        <section className="lg:col-span-3" aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="mb-3 text-base font-semibold">
            Activity
          </h2>
          <ActivityList userId={candidateId} />
        </section>
      </div>

      {confirm && (
        <ConfirmationDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={ACTIONS[confirm].title}
          description={ACTIONS[confirm].description}
          confirmLabel={ACTIONS[confirm].label}
          destructive={!!ACTIONS[confirm].destructive}
          onConfirm={() => void runStatus(confirm)}
        />
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit candidate</DialogTitle>
            <DialogDescription>
              Update the candidate's details. Changes are recorded in the activity log.
            </DialogDescription>
          </DialogHeader>
          <CandidateForm
            mode="edit"
            submitLabel="Save changes"
            onCancel={() => setEditing(false)}
            initial={{
              fullName: c.full_name ?? "",
              candidateId: c.candidate_id ?? "",
              email: c.email ?? "",
              phone: c.phone ?? "",
              location: c.location ?? "",
              hrEmployeeId: c.hr_employee_id ?? "",
              joiningDate: c.joining_date ?? "",
              department: c.department ?? "",
              designation: c.designation ?? "",
              accountStatus: status,
              academyStatus: c.academy_status ?? "not_started",
            }}
            onSubmit={async (v) => {
              const res = await update({
                data: { ...v, userId: candidateId, academyStatus: v.academyStatus as never },
              });
              if (!res.ok) return res;
              toast.success("Candidate updated");
              await refresh();
              setEditing(false);
              return { ok: true };
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-md border bg-card p-5 ${className ?? ""}`}>
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
