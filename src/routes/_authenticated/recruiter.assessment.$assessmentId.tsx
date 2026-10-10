import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/layouts/AppShell";
import { EmptyState, ErrorState, LoadingState, NotFoundState } from "@/components/states";
import { overviewQuery } from "@/features/academy/academy";
import {
  ATTEMPT_STATUS_LABEL,
  attemptsQuery,
  fmtDuration,
} from "@/features/assessments/assessments";
import { AttemptView, Stat } from "@/features/assessments/AttemptView";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/recruiter/assessment/$assessmentId")({
  head: () => ({
    meta: [
      { title: "Module Assessment — E2E Recruiter Academy" },
      { name: "description", content: "Take the module assessment and review your result." },
      { property: "og:title", content: "Module Assessment — E2E Recruiter Academy" },
      {
        property: "og:description",
        content: "Take the module assessment and review your result.",
      },
    ],
  }),
  component: AssessmentPage,
});

function AssessmentPage() {
  const { assessmentId } = Route.useParams();
  const { session } = Route.useRouteContext();
  const qc = useQueryClient();
  const overview = useQuery(overviewQuery(session.userId));
  const mod = overview.data?.find((m) => String(m.module_number) === assessmentId);
  const attempts = useQuery({
    ...attemptsQuery(session.userId, mod?.module_id),
    enabled: !!mod,
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const back = (
    <Link
      to="/recruiter/module/$moduleId"
      params={{ moduleId: assessmentId }}
      className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Back to module
    </Link>
  );

  if (overview.isPending || (mod && attempts.isPending))
    return <LoadingState label="Loading assessment…" />;
  if (overview.isError || attempts.isError)
    return <ErrorState description="The assessment could not be loaded." />;
  if (!mod) return <NotFoundState />;

  if (activeId) {
    return (
      <AttemptView
        attemptId={activeId}
        onExit={async () => {
          setActiveId(null);
          await qc.invalidateQueries({ queryKey: ["academy"] });
          await qc.invalidateQueries({ queryKey: ["assessment"] });
        }}
      />
    );
  }

  const list = attempts.data ?? [];
  const inProgress = list.find(
    (a) => a.status === "in_progress" && new Date(a.expires_at) > new Date(),
  );
  const canStart = mod.state !== "locked" && mod.lessons_completed && !mod.assessment_passed;

  async function begin() {
    if (!mod) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("start_module_assessment", {
      _module: mod.module_id,
    });
    setBusy(false);
    if (error || !data) {
      toast.error(error?.message ?? "The assessment could not be started.");
      return;
    }
    setActiveId(data);
  }

  return (
    <>
      {back}
      <PageHeader title={`Module ${mod.module_number} Assessment`} description={mod.title} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Questions" value="20" />
        <Stat label="Time limit" value="20 minutes" />
        <Stat label="Pass mark" value={`${mod.pass_mark}%`} />
      </div>

      <section className="mb-6 rounded-md border bg-card p-5">
        <h2 className="text-base font-semibold">Before you begin</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Questions are drawn from the module question bank; each attempt is different.</li>
          <li>Answers save automatically. The attempt submits automatically when time runs out.</li>
          <li>A score of {mod.pass_mark}% or above is a pass. Retries are unlimited.</li>
          <li>The next module unlocks only after you pass this assessment.</li>
        </ul>
        <div className="mt-5">
          {mod.assessment_passed ? (
            <p className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="size-4 text-primary" /> You have passed this assessment.
            </p>
          ) : inProgress ? (
            <Button onClick={() => setActiveId(inProgress.id)}>Continue attempt</Button>
          ) : canStart ? (
            <Button onClick={begin} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {list.length ? "Retry assessment" : "Start assessment"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Complete all required lessons in this module to unlock the assessment.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-md border bg-card">
        <h2 className="border-b px-5 py-3 text-base font-semibold">Attempt history</h2>
        {list.length === 0 ? (
          <EmptyState title="No attempts yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-2">Attempt</th>
                  <th className="px-5 py-2">Date</th>
                  <th className="px-5 py-2">Score</th>
                  <th className="px-5 py-2">Result</th>
                  <th className="px-5 py-2">Time</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="px-5 py-2">#{a.attempt_number}</td>
                    <td className="px-5 py-2">{new Date(a.started_at).toLocaleString()}</td>
                    <td className="px-5 py-2 tabular-nums">
                      {a.score_percent == null
                        ? "—"
                        : `${Math.round(Number(a.score_percent))}% (${a.correct_count}/${a.question_count})`}
                    </td>
                    <td className="px-5 py-2">{ATTEMPT_STATUS_LABEL[a.status]}</td>
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
