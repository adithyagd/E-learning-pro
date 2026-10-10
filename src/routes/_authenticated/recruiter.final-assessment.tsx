import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/layouts/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { PerformanceBadge } from "@/components/performance/PerformanceBadge";
import { ModuleStateBadge } from "@/features/academy/components";
import { overviewQuery } from "@/features/academy/academy";
import {
  ATTEMPT_STATUS_LABEL,
  finalOverviewQuery,
  finalSummary,
  fmtDuration,
} from "@/features/assessments/assessments";
import { AttemptView, Stat } from "@/features/assessments/AttemptView";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/recruiter/final-assessment")({
  head: () => ({
    meta: [
      { title: "Final Assessment — E2E Recruiter Academy" },
      {
        name: "description",
        content: "Recruitment Academy Final Assessment: 20 questions, 20 minutes, 70% to pass.",
      },
      { property: "og:title", content: "Final Assessment — E2E Recruiter Academy" },
      { property: "og:description", content: "Recruitment Academy Final Assessment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FinalAssessmentPage,
});

function FinalAssessmentPage() {
  const { session } = Route.useRouteContext();
  const qc = useQueryClient();
  const final = useQuery(finalOverviewQuery(session.userId));
  const modules = useQuery(overviewQuery(session.userId));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    void supabase.rpc("final_assessment_overview", { _candidate: session.userId, _log_open: true });
  }, [session.userId]);

  if (final.isPending || modules.isPending)
    return <LoadingState label="Loading Final Assessment…" />;
  if (final.isError || modules.isError)
    return (
      <ErrorState
        description="The Final Assessment could not be loaded."
        onRetry={() => final.refetch()}
      />
    );
  const o = final.data;
  if (!o.available)
    return (
      <EmptyState title="Final Assessment not available" description="Please check back later." />
    );

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["assessment"] });
    await qc.invalidateQueries({ queryKey: ["academy"] });
  };

  async function begin() {
    setBusy(true);
    const { data, error } = await supabase.rpc("start_final_assessment");
    setBusy(false);
    if (error || !data) {
      toast.error(
        error?.message === "Final Assessment locked"
          ? "The Final Assessment is locked."
          : "The Final Assessment could not be started.",
      );
      await refresh();
      return;
    }
    setActiveId(data);
  }

  if (activeId)
    return (
      <AttemptView
        attemptId={activeId}
        onExit={async () => {
          setActiveId(null);
          await refresh();
        }}
        onRetry={
          o.passed
            ? undefined
            : async () => {
                setActiveId(null);
                await refresh();
                await begin();
              }
        }
      />
    );

  const s = finalSummary(o);
  const mods = modules.data;

  return (
    <>
      <PageHeader title="Final Assessment" description="Recruitment Academy Final Assessment" />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Questions" value={`${o.question_count} Questions`} />
        <Stat label="Time limit" value={`${(o.time_limit_seconds ?? 0) / 60} Minutes`} />
        <Stat label="Passing score" value={`${o.pass_mark}%`} />
      </div>

      {!o.eligible ? (
        <section className="mb-6 rounded-md border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Lock className="size-4" aria-hidden /> Final Assessment Locked
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete all five Academy modules and pass each module assessment with at least 70% to
            unlock the Final Assessment.
          </p>
          <ul className="mt-4 divide-y rounded-md border">
            {mods.map((m) => (
              <li
                key={m.module_id}
                className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium">
                  Module {m.module_number} — {m.title}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Assessment: {m.assessment_passed ? "Passed" : "Not passed"}
                  </span>
                  <ModuleStateBadge state={m.state} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="mb-6 rounded-md border bg-card p-5">
          <h2 className="text-base font-semibold">Before you begin</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Questions cover all five modules and are drawn from a dedicated question bank.</li>
            <li>Each attempt receives a different combination of questions.</li>
            <li>
              Answers save automatically. The attempt submits automatically when time runs out.
            </li>
            <li>A score of {o.pass_mark}% or above is a pass. Retries are unlimited.</li>
          </ul>
          <div className="mt-5">
            {o.passed ? (
              <div className="space-y-1 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="size-4 text-success" /> Final Assessment Passed
                </p>
                <p className="font-medium">Certificate Status: Pending Admin Approval</p>
                <p className="text-muted-foreground">
                  Your Academy completion has been submitted for certificate review.
                </p>
              </div>
            ) : o.active_attempt_id ? (
              <Button onClick={() => setActiveId(o.active_attempt_id!)}>Continue Assessment</Button>
            ) : (
              <Button onClick={begin} disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                {s.list.length ? "Retry Assessment" : "Start Final Assessment"}
              </Button>
            )}
          </div>
        </section>
      )}

      <section className="rounded-md border bg-card">
        <h2 className="border-b px-5 py-3 text-base font-semibold">Attempt history</h2>
        {s.count === 0 ? (
          <EmptyState title="No attempts yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  {["Attempt", "Date", "Score", "Performance", "Result", "Time", ""].map((h) => (
                    <th key={h} className="px-5 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(o.attempts ?? []).map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="px-5 py-2">#{a.attempt_number}</td>
                    <td className="px-5 py-2 whitespace-nowrap">
                      {new Date(a.started_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-2 tabular-nums">
                      {a.score_percent == null
                        ? "—"
                        : `${Math.round(Number(a.score_percent))}% (${a.correct_count}/${a.question_count})`}
                    </td>
                    <td className="px-5 py-2">
                      {a.score_percent == null ? (
                        "—"
                      ) : (
                        <PerformanceBadge value={Number(a.score_percent)} />
                      )}
                    </td>
                    <td className="px-5 py-2">
                      {a.status === "in_progress" ? "In progress" : a.passed ? "PASS" : "FAIL"}
                      {a.status === "timed_out" && ` · ${ATTEMPT_STATUS_LABEL.timed_out}`}
                    </td>
                    <td className="px-5 py-2">{fmtDuration(a.duration_seconds)}</td>
                    <td className="px-5 py-2 text-right">
                      {a.status !== "in_progress" && (
                        <Button size="sm" variant="ghost" onClick={() => setActiveId(a.id)}>
                          Review
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
