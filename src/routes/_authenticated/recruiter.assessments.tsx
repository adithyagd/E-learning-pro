import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/layouts/AppShell";
import { ErrorState, LoadingState } from "@/components/states";
import { overviewQuery } from "@/features/academy/academy";
import {
  attemptsQuery,
  finalOverviewQuery,
  finalSummary,
} from "@/features/assessments/assessments";

export const Route = createFileRoute("/_authenticated/recruiter/assessments")({
  head: () => ({
    meta: [
      { title: "Assessments — E2E Recruiter Academy" },
      { name: "description", content: "Your module and final assessments." },
      { property: "og:title", content: "Assessments — E2E Recruiter Academy" },
      { property: "og:description", content: "Your module and final assessments." },
    ],
  }),
  component: AssessmentsList,
});

function AssessmentsList() {
  const { session } = Route.useRouteContext();
  const overview = useQuery(overviewQuery(session.userId));
  const attempts = useQuery(attemptsQuery(session.userId));
  const final = useQuery(finalOverviewQuery(session.userId));
  if (overview.isPending || attempts.isPending) return <LoadingState />;
  if (overview.isError || attempts.isError)
    return <ErrorState description="Assessments could not be loaded." />;
  const all = (attempts.data ?? []).filter((a) => a.module_id);
  const fs = finalSummary(final.data);

  return (
    <>
      <PageHeader title="Assessments" description="Module assessments — pass mark 70%." />
      <div className="space-y-3">
        {overview.data.map((m) => {
          const mine = all.filter((a) => a.module_id === m.module_id);
          const best = mine.reduce((b, a) => Math.max(b, Number(a.score_percent ?? 0)), 0);
          const status = m.assessment_passed
            ? "Passed"
            : m.state === "locked"
              ? "Locked"
              : m.lessons_completed
                ? mine.length
                  ? "Not yet passed — retry available"
                  : "Ready"
                : "Locked until lessons are completed";
          return (
            <div
              key={m.module_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-4"
            >
              <div>
                <p className="font-medium">
                  Module {m.module_number} Assessment — {m.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {status} · {mine.length} attempt{mine.length === 1 ? "" : "s"}
                  {mine.length > 0 && ` · best ${Math.round(best)}%`}
                </p>
              </div>
              {m.lessons_completed && m.state !== "locked" && (
                <Button asChild size="sm" variant="outline">
                  <Link
                    to="/recruiter/assessment/$assessmentId"
                    params={{ assessmentId: String(m.module_number) }}
                  >
                    Open
                  </Link>
                </Button>
              )}
            </div>
          );
        })}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-4">
          <div>
            <p className="font-medium">Final Assessment</p>
            <p className="text-sm text-muted-foreground">
              {fs.status} · {fs.count} attempt{fs.count === 1 ? "" : "s"}
              {fs.best != null && ` · best ${Math.round(fs.best)}%`}
              {fs.latest &&
                ` · latest ${Math.round(Number(fs.latest.score_percent ?? 0))}% (${fs.latest.passed ? "PASS" : "FAIL"}) on ${new Date(fs.latest.submitted_at ?? fs.latest.started_at).toLocaleDateString()}`}
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/recruiter/final-assessment">Open</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
