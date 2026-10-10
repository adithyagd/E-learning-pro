import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog, ErrorState, LoadingState } from "@/components/states";
import { PerformanceBadge } from "@/components/performance/PerformanceBadge";
import {
  ATTEMPT_STATUS_LABEL,
  QUESTION_TYPE_LABEL,
  attemptQuery,
  fmtDuration,
  type AttemptDetail,
} from "@/features/assessments/assessments";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/** Shared attempt runner + result/review for module and Final Assessments (one engine). */
export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export function AttemptView({
  attemptId,
  onExit,
  onRetry,
}: {
  attemptId: string;
  onExit: () => void;
  onRetry?: (() => void) | undefined;
}) {
  const qc = useQueryClient();
  const q = useQuery(attemptQuery(attemptId));
  if (q.isPending) return <LoadingState label="Loading attempt…" />;
  if (q.isError || !q.data) return <ErrorState description="This attempt could not be loaded." />;
  const a = q.data;
  if (a.status === "in_progress")
    return (
      <Runner
        attempt={a}
        onDone={() => qc.invalidateQueries({ queryKey: ["assessment", "attempt", attemptId] })}
        onExit={onExit}
      />
    );
  return <Result attempt={a} onExit={onExit} onRetry={onRetry} />;
}

function Runner({
  attempt,
  onDone,
  onExit,
}: {
  attempt: AttemptDetail;
  onDone: () => void;
  onExit: () => void;
}) {
  const [pos, setPos] = useState(attempt.current_position || 1);
  const [answers, setAnswers] = useState<Record<number, string[]>>(() =>
    Object.fromEntries(attempt.questions.map((x) => [x.position, x.selected ?? []])),
  );
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Offset between server and client clock so the countdown follows the server.
  const skew = useRef(new Date(attempt.server_now).getTime() - Date.now());
  const expires = new Date(attempt.expires_at).getTime();
  const [left, setLeft] = useState(() => Math.max(0, expires - (Date.now() + skew.current)));
  const submitted = useRef(false);

  async function submit() {
    if (submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    const { error } = await supabase.rpc("submit_assessment", { _attempt: attempt.id });
    setSubmitting(false);
    if (error) {
      submitted.current = false;
      toast.error("The assessment could not be submitted. Try again.");
      return;
    }
    onDone();
  }

  useEffect(() => {
    const t = setInterval(() => {
      const l = Math.max(0, expires - (Date.now() + skew.current));
      setLeft(l);
      if (l === 0) {
        clearInterval(t);
        toast.info("Time is up. Your attempt has been submitted.");
        void submit();
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expires]);

  const question = attempt.questions.find((x) => x.position === pos)!;
  const multi = question.question_type === "multiple_choice";
  const sel = answers[pos] ?? [];
  const answered = Object.values(answers).filter((v) => v.length > 0).length;

  async function choose(id: string) {
    const next = multi ? (sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id]) : [id];
    setAnswers((p) => ({ ...p, [pos]: next }));
    const { data, error } = await supabase.rpc("save_assessment_answer", {
      _attempt: attempt.id,
      _position: pos,
      _selected: next,
      _current: pos,
    });
    if (error) toast.error("Your answer could not be saved.");
    else if ((data as { timed_out?: boolean })?.timed_out) onDone();
  }
  function go(p: number) {
    setPos(p);
    void supabase.rpc("save_assessment_answer", {
      _attempt: attempt.id,
      _position: p,
      _selected: null as unknown as string[],
      _current: p,
    });
  }

  const mins = Math.floor(left / 60000);
  const secs = Math.floor((left % 60000) / 1000);

  return (
    <>
      <button
        onClick={onExit}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Leave (progress is saved)
      </button>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {attemptTitle(attempt)} · Attempt {attempt.attempt_number}
          </h1>
          <p className="text-sm text-muted-foreground">
            Question {pos} of {attempt.question_count} · {answered} answered
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium tabular-nums",
            left < (isFinal(attempt) ? 300000 : 120000) && "border-destructive text-destructive",
          )}
          aria-live="polite"
        >
          <Clock className="size-4" /> {mins}:{String(secs).padStart(2, "0")}
          {left < 300000 && isFinal(attempt) && (
            <span className="sr-only">Less than five minutes left</span>
          )}
        </div>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded bg-muted" aria-hidden>
        <div
          className="h-full bg-primary"
          style={{ width: `${(answered / attempt.question_count) * 100}%` }}
        />
      </div>
      {isFinal(attempt) && left < 300000 && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-destructive p-2 text-sm text-destructive"
        >
          Less than 5 minutes remaining. Your attempt submits automatically when time runs out.
        </p>
      )}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {attempt.questions.map((x) => (
          <button
            key={x.position}
            onClick={() => go(x.position)}
            aria-label={`Question ${x.position}`}
            className={cn(
              "size-8 rounded border text-xs tabular-nums",
              x.position === pos && "border-primary ring-1 ring-primary",
              (answers[x.position]?.length ?? 0) > 0 && "bg-primary/10",
            )}
          >
            {x.position}
          </button>
        ))}
      </div>

      <section className="rounded-md border bg-card p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {QUESTION_TYPE_LABEL[question.question_type]}
          {multi && " · select all that apply"}
        </p>
        {question.scenario_text && (
          <p className="mt-3 rounded-md bg-muted p-3 text-sm">{question.scenario_text}</p>
        )}
        <p className="mt-3 font-medium">{question.question_text}</p>
        <div className="mt-4 space-y-2" role={multi ? "group" : "radiogroup"}>
          {question.options.map((o) => {
            const on = sel.includes(o.id);
            return (
              <button
                key={o.id}
                role={multi ? "checkbox" : "radio"}
                aria-checked={on}
                onClick={() => choose(o.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors hover:bg-muted",
                  on && "border-primary bg-primary/5",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 size-4 shrink-0 border",
                    multi ? "rounded-sm" : "rounded-full",
                    on && "border-primary bg-primary",
                  )}
                />
                {o.text}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <Button variant="outline" disabled={pos <= 1} onClick={() => go(pos - 1)}>
          Previous
        </Button>
        <div className="flex gap-2">
          {pos < attempt.question_count && <Button onClick={() => go(pos + 1)}>Next</Button>}
          <Button
            variant={pos < attempt.question_count ? "outline" : "default"}
            onClick={() => setConfirm(true)}
            disabled={submitting}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}{" "}
            {isFinal(attempt) ? "Submit Assessment" : "Submit"}
          </Button>
        </div>
      </div>

      <ConfirmationDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={
          isFinal(attempt)
            ? "Are you sure you want to submit your Final Assessment?"
            : "Submit assessment?"
        }
        cancelLabel={isFinal(attempt) ? "Continue Assessment" : undefined}
        description={
          answered < attempt.question_count
            ? `You have answered ${answered} of ${attempt.question_count} questions. Unanswered questions are marked incorrect.`
            : "You cannot change your answers after submitting."
        }
        confirmLabel={isFinal(attempt) ? "Submit Assessment" : "Submit"}
        onConfirm={() => {
          setConfirm(false);
          void submit();
        }}
      />
    </>
  );
}

function Result({
  attempt,
  onExit,
  onRetry,
}: {
  attempt: AttemptDetail;
  onExit: () => void;
  onRetry?: (() => void) | undefined;
}) {
  if (isFinal(attempt)) return <FinalResult attempt={attempt} onExit={onExit} onRetry={onRetry} />;
  return <ModuleResult attempt={attempt} onExit={onExit} />;
}

function FinalResult({
  attempt,
  onExit,
  onRetry,
}: {
  attempt: AttemptDetail;
  onExit: () => void;
  onRetry?: (() => void) | undefined;
}) {
  const passed = !!attempt.passed;
  const pct = Number(attempt.score_percent ?? 0);
  const answered = attempt.questions.filter((x) => x.selected.length > 0).length;
  return (
    <>
      <button
        onClick={onExit}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Final Assessment
      </button>
      <section className="mb-6 rounded-md border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          {passed ? (
            <CheckCircle2 className="size-8 text-success" />
          ) : (
            <XCircle className="size-8 text-destructive" />
          )}
          <div>
            <h1 className="text-xl font-semibold">
              {passed ? "Final Assessment Passed" : "Final Assessment Not Passed"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Attempt {attempt.attempt_number} · {ATTEMPT_STATUS_LABEL[attempt.status]}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Score" value={`${attempt.correct_count ?? 0} / ${attempt.question_count}`} />
          <Stat label="Percentage" value={`${Math.round(pct)}%`} />
          <Stat label="Questions answered" value={`${answered} / ${attempt.question_count}`} />
          <Stat label="Time taken" value={fmtDuration(attempt.duration_seconds)} />
          <Stat label="Attempt" value={`#${attempt.attempt_number}`} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">Performance:</span>
          <PerformanceBadge value={pct} />
          <span className="text-muted-foreground">Assessment:</span>
          <span
            className={cn(
              "rounded px-2 py-0.5 text-xs font-semibold",
              passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
            )}
          >
            {passed ? "PASS" : "FAIL"}
          </span>
        </div>
        {passed ? (
          <div className="mt-4 rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Certificate Status: Pending Admin Approval</p>
            <p className="text-muted-foreground">
              Your Academy completion has been submitted for certificate review.
            </p>
          </div>
        ) : (
          onRetry && (
            <Button className="mt-4" onClick={onRetry}>
              Retry Assessment
            </Button>
          )
        )}
      </section>
      <Review attempt={attempt} />
    </>
  );
}

function ModuleResult({ attempt, onExit }: { attempt: AttemptDetail; onExit: () => void }) {
  const passed = !!attempt.passed;
  return (
    <>
      <button
        onClick={onExit}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to assessment
      </button>
      <section className="mb-6 rounded-md border bg-card p-5">
        <div className="flex items-center gap-3">
          {passed ? (
            <CheckCircle2 className="size-8 text-primary" />
          ) : (
            <XCircle className="size-8 text-destructive" />
          )}
          <div>
            <h1 className="text-xl font-semibold">{passed ? "PASS" : "FAIL"}</h1>
            <p className="text-sm text-muted-foreground">
              Module {attempt.module_number} Assessment · Attempt {attempt.attempt_number} ·{" "}
              {ATTEMPT_STATUS_LABEL[attempt.status]}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <Stat label="Score" value={`${Math.round(Number(attempt.score_percent ?? 0))}%`} />
          <Stat
            label="Correct"
            value={`${attempt.correct_count ?? 0} / ${attempt.question_count}`}
          />
          <Stat label="Pass mark" value={`${attempt.pass_mark}%`} />
          <Stat label="Time taken" value={fmtDuration(attempt.duration_seconds)} />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {passed
            ? "The next module is now unlocked."
            : "Review the explanations below, revisit the lessons, and retry when ready. The next module stays locked until you pass."}
        </p>
      </section>

      <Review attempt={attempt} />
    </>
  );
}

function Review({ attempt }: { attempt: AttemptDetail }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Answer review</h2>
      {attempt.questions.map((x) => (
        <div key={x.position} className="rounded-md border bg-card p-4 text-sm">
          <p className="flex items-start gap-2 font-medium">
            {x.is_correct ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            )}
            {x.position}. {x.question_text}
          </p>
          {x.scenario_text && (
            <p className="mt-2 rounded bg-muted p-2 text-muted-foreground">{x.scenario_text}</p>
          )}
          <ul className="mt-2 space-y-1">
            {x.options.map((o) => {
              const correct = x.correct?.includes(o.id);
              const chosen = x.selected.includes(o.id);
              return (
                <li
                  key={o.id}
                  className={cn(
                    "rounded px-2 py-1",
                    correct && "bg-primary/10 font-medium",
                    chosen && !correct && "bg-destructive/10",
                  )}
                >
                  {o.text}
                  {chosen && " — your answer"}
                  {correct && " ✓"}
                </li>
              );
            })}
          </ul>
          {x.explanation && <p className="mt-2 text-muted-foreground">{x.explanation}</p>}
        </div>
      ))}
    </section>
  );
}

function isFinal(a: AttemptDetail) {
  return a.scope === "final";
}
function attemptTitle(a: AttemptDetail) {
  return isFinal(a) ? "Final Assessment" : `Module ${a.module_number} Assessment`;
}
