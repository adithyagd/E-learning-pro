import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/layouts/AppShell";
import { EmptyState, ErrorState, LoadingState, PermissionDenied } from "@/components/states";
import { PerformanceBadge, PerformanceBar } from "@/components/performance/PerformanceBadge";
import { AcademyStatusBadge } from "@/features/candidates/StatusBadges";
import { CoachingBadge, Section } from "@/features/staff/components";
import {
  actionLabel,
  COACHING_LABEL,
  COACHING_STATUSES,
  fmtDate,
  fmtDateTime,
  rpcError,
  scopedActivityQuery,
  supportReasons,
  traineeOverviewQuery,
  type CoachingStatus,
} from "@/features/staff/staff";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/trainer/candidates/$candidateId")({
  head: () => ({
    meta: [
      { title: "Trainee — E2E Recruiter Academy" },
      { name: "description", content: "Progress and coaching notes for this trainee." },
      { property: "og:title", content: "Trainee — E2E Recruiter Academy" },
      { property: "og:description", content: "Progress and coaching notes for this trainee." },
    ],
  }),
  component: TraineeDetail,
});

function TraineeDetail() {
  const { candidateId } = Route.useParams();
  const ov = useQuery(traineeOverviewQuery());
  const act = useQuery(scopedActivityQuery(candidateId));
  const attempts = useQuery({
    queryKey: ["staff", "attempts", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_attempts")
        .select(
          "id, attempt_number, status, score_percent, passed, submitted_at, academy_modules(module_number), assessment_configs(scope)",
        )
        .eq("candidate_id", candidateId)
        .neq("status", "in_progress")
        .order("submitted_at", { ascending: false })
        .limit(50);
      if (error) throw new Error("Assessment results could not be loaded.");
      return data ?? [];
    },
  });

  if (ov.isPending) return <LoadingState label="Loading trainee…" />;
  if (ov.isError) return <ErrorState description={ov.error.message} onRetry={() => ov.refetch()} />;
  const t = ov.data.find((r) => r.user_id === candidateId);
  if (!t) return <PermissionDenied description="This candidate is not assigned to you." />;
  const reasons = supportReasons(t);

  return (
    <>
      <Link
        to="/trainer/trainees"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Assigned trainees
      </Link>
      <PageHeader
        title={t.full_name || "Trainee"}
        description={`${t.candidate_code}${t.designation ? ` · ${t.designation}` : ""}${t.team_name ? ` · ${t.team_name}` : ""}`}
        actions={<AcademyStatusBadge status={t.academy_status} />}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Overall progress">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <PerformanceBadge value={Number(t.progress_percent)} />
              <span className="text-muted-foreground">
                Last activity: {fmtDate(t.last_activity_at)}
              </span>
              <span className="text-muted-foreground">Assigned: {fmtDate(t.assigned_at)}</span>
            </div>
            {reasons.length > 0 && (
              <p className="mt-3 rounded-sm border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
                Needs support: {reasons.join(" · ")}
              </p>
            )}
            <ul className="mt-4 space-y-3">
              {(t.modules ?? []).map((m) => (
                <li key={m.module_number}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span>
                      <span className="font-medium">Module {m.module_number}</span> · {m.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {m.completed_lessons}/{m.total_lessons} lessons ·{" "}
                      {m.attempts
                        ? `${m.assessment_passed ? "Assessment passed" : "Assessment not passed"} · best ${Math.round(Number(m.best_score ?? 0))}% · ${m.attempts} attempt${m.attempts === 1 ? "" : "s"}`
                        : "Assessment not attempted"}
                    </span>
                  </div>
                  <PerformanceBar value={Number(m.percentage)} className="mt-1.5" />
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm">
              Final Assessment:{" "}
              {t.final?.attempts
                ? `${t.final.passed ? "Passed" : "Not passed"} · best ${Math.round(Number(t.final.best_score ?? 0))}%`
                : "Not attempted"}
            </p>
          </Section>

          <Section title="Assessment results">
            {attempts.isPending ? (
              <LoadingState />
            ) : attempts.isError ? (
              <ErrorState description={attempts.error.message} />
            ) : attempts.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submitted assessments yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {attempts.data.map((a) => (
                  <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      {a.assessment_configs?.scope === "final"
                        ? "Final Assessment"
                        : `Module ${a.academy_modules?.module_number ?? "?"}`}{" "}
                      · attempt {a.attempt_number}
                    </span>
                    <span className="text-muted-foreground">
                      {Math.round(Number(a.score_percent ?? 0))}% ·{" "}
                      {a.passed ? "PASS" : a.status === "timed_out" ? "TIMED OUT · FAIL" : "FAIL"} ·{" "}
                      {fmtDate(a.submitted_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Recent activity">
            {act.isPending ? (
              <LoadingState />
            ) : (act.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No recorded activity yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {act.data!.slice(0, 20).map((a) => (
                  <li key={a.id} className="flex justify-between gap-3 py-2">
                    <span>{actionLabel(a.action)}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {fmtDateTime(a.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
        <CoachingNotes candidateId={candidateId} />
      </div>
    </>
  );
}

function CoachingNotes({ candidateId }: { candidateId: string }) {
  const qc = useQueryClient();
  const notes = useQuery({
    queryKey: ["staff", "notes", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaching_notes")
        .select("id, content, status, follow_up_date, created_at, updated_at, trainer_id")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
      if (error) throw new Error("Coaching notes could not be loaded.");
      return data ?? [];
    },
  });
  const [editing, setEditing] = useState<string | null>(null);
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["staff", "notes", candidateId] }),
      qc.invalidateQueries({ queryKey: ["staff", "overview"] }),
    ]);

  return (
    <div className="space-y-4">
      <Section title="Coaching notes">
        <p className="mb-3 text-xs text-muted-foreground">
          Visible only to you and administrators — never to the candidate. Do not record passwords
          or unnecessary personal details.
        </p>
        <NoteForm candidateId={candidateId} onSaved={refresh} />
      </Section>
      {notes.isPending ? (
        <LoadingState />
      ) : notes.isError ? (
        <ErrorState description={notes.error.message} />
      ) : notes.data.length === 0 ? (
        <EmptyState title="No coaching notes yet" />
      ) : (
        <ul className="space-y-3">
          {notes.data.map((n) => (
            <li key={n.id} className="rounded-md border bg-card p-3 text-sm">
              {editing === n.id ? (
                <NoteForm
                  candidateId={candidateId}
                  note={n}
                  onSaved={async () => {
                    setEditing(null);
                    await refresh();
                  }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <CoachingBadge status={n.status} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(n.id)}
                      aria-label="Edit note"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words">{n.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Follow-up: {fmtDate(n.follow_up_date)} · Created {fmtDateTime(n.created_at)}
                    {n.updated_at !== n.created_at ? ` · Updated ${fmtDateTime(n.updated_at)}` : ""}
                  </p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteForm({
  candidateId,
  note,
  onSaved,
  onCancel,
}: {
  candidateId: string;
  note?: { id: string; content: string; status: CoachingStatus; follow_up_date: string | null };
  onSaved: () => Promise<unknown>;
  onCancel?: () => void;
}) {
  const [content, setContent] = useState(note?.content ?? "");
  const [status, setStatus] = useState<CoachingStatus>(note?.status ?? "open");
  const [follow, setFollow] = useState(note?.follow_up_date ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const id = note?.id ?? "new";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const c = content.trim();
    if (c.length < 3 || c.length > 4000) return setErr("Note must be 3–4000 characters.");
    setBusy(true);
    setErr(null);
    const args = { _content: c, _status: status, _follow_up: (follow || null) as string };
    const { error } = note
      ? await supabase.rpc("update_coaching_note", { _note: note.id, ...args })
      : await supabase.rpc("add_coaching_note", { _candidate: candidateId, ...args });
    setBusy(false);
    if (error) return setErr(rpcError(error.message));
    toast.success(note ? "Coaching note updated" : "Coaching note added");
    if (!note) {
      setContent("");
      setStatus("open");
      setFollow("");
    }
    await onSaved();
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div>
        <Label htmlFor={`note-${id}`}>Note</Label>
        <Textarea
          id={`note-${id}`}
          value={content}
          maxLength={4000}
          rows={4}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor={`status-${id}`}>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as CoachingStatus)}>
            <SelectTrigger id={`status-${id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COACHING_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {COACHING_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={`follow-${id}`}>Follow-up date</Label>
          <Input
            id={`follow-${id}`}
            type="date"
            value={follow}
            onChange={(e) => setFollow(e.target.value)}
          />
        </div>
      </div>
      {err && (
        <p role="alert" className="text-sm text-destructive">
          {err}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving…" : note ? "Save changes" : "Add note"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
