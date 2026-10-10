import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Award, ClipboardCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/layouts/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { PerformanceBadge, PerformanceBar } from "@/components/performance/PerformanceBadge";
import { ModuleStateBadge } from "@/features/academy/components";
import {
  currentModule,
  finalAssessmentState,
  overallProgress,
  overviewQuery,
  recentLearningQuery,
} from "@/features/academy/academy";
import { ACTIVITY_LABEL, formatDate } from "@/features/candidates/queries";

export const Route = createFileRoute("/_authenticated/recruiter/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — E2E Recruiter Academy" },
      { name: "description", content: "Your academy progress and next steps." },
      { property: "og:title", content: "Dashboard — E2E Recruiter Academy" },
      { property: "og:description", content: "Your academy progress and next steps." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { session } = Route.useRouteContext();
  const q = useQuery(overviewQuery(session.userId));
  const recent = useQuery(recentLearningQuery(session.userId));

  if (q.isPending) return <LoadingState label="Loading your academy…" />;
  if (q.isError)
    return (
      <ErrorState
        description="Your academy progress could not be loaded."
        onRetry={() => q.refetch()}
      />
    );
  const modules = q.data;
  if (!modules.length)
    return (
      <EmptyState
        title="Academy not available"
        description="No modules are active yet. Please check back later."
      />
    );

  const overall = overallProgress(modules);
  const current = currentModule(modules);
  const completed = modules.filter((m) => m.state === "completed");
  const locked = modules.filter((m) => m.state === "locked");
  const finalState = finalAssessmentState(modules);
  const moduleTitle = new Map(
    modules.map((m) => [m.module_id, `Module ${m.module_number} — ${m.title}`]),
  );
  const next = current
    ? current.lessons_completed && current.requires_assessment && !current.assessment_passed
      ? { label: `Take the Module ${current.module_number} assessment`, cta: "View module" }
      : {
          label: `${current.state === "in_progress" ? "Continue" : "Start"} Module ${current.module_number}`,
          cta: current.state === "in_progress" ? "Continue" : "Start",
        }
    : null;

  return (
    <>
      <PageHeader
        title={`Welcome${session.fullName ? `, ${session.fullName.split(" ")[0]}` : ""}`}
        description="Recruiter Academy — your learning progress."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-md border bg-card p-5" aria-labelledby="overall">
          <h2 id="overall" className="text-sm font-medium text-muted-foreground">
            Overall progress
          </h2>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{Math.round(overall)}%</p>
          <PerformanceBar value={overall} className="mt-3" />
          <div className="mt-3">
            <PerformanceBadge value={overall} showValue={false} />
          </div>
        </section>

        <section className="rounded-md border bg-card p-5 lg:col-span-2" aria-labelledby="current">
          <h2 id="current" className="text-sm font-medium text-muted-foreground">
            Current module
          </h2>
          {current ? (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold">
                  Module {current.module_number} — {current.title}
                </p>
                <ModuleStateBadge state={current.state} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Next action: {next?.label}</p>
              <Button asChild className="mt-4">
                <Link
                  to="/recruiter/module/$moduleId"
                  params={{ moduleId: String(current.module_number) }}
                >
                  {next?.cta} <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </>
          ) : (
            <p className="mt-2 text-sm">All modules completed.</p>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Completed modules" value={`${completed.length} of ${modules.length}`} />
        <Stat
          label="Locked modules"
          value={String(locked.length)}
          icon={<Lock className="size-4" aria-hidden />}
        />
        <Stat
          label="Final assessment"
          value={finalState === "available" ? "Available" : "Locked"}
          icon={<ClipboardCheck className="size-4" aria-hidden />}
        />
        <Stat
          label="Certificate"
          value="Not available"
          icon={<Award className="size-4" aria-hidden />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2" aria-labelledby="modules-h">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="modules-h" className="text-base font-semibold">
              Modules
            </h2>
            <Link
              to="/recruiter/modules"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="divide-y rounded-md border bg-card">
            {modules.map((m) => (
              <li
                key={m.module_id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Module {m.module_number} — {m.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Assessment:{" "}
                    {m.assessment_passed
                      ? "Passed"
                      : m.state === "locked"
                        ? "Locked"
                        : "Not yet taken"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                    {Math.round(Number(m.percentage))}%
                  </span>
                  <ModuleStateBadge state={m.state} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="recent-h">
          <h2 id="recent-h" className="mb-3 text-base font-semibold">
            Recent learning activity
          </h2>
          {recent.isPending ? (
            <LoadingState />
          ) : recent.isError ? (
            <ErrorState description="Activity could not be loaded." />
          ) : recent.data.length === 0 ? (
            <EmptyState
              title="No learning activity yet"
              description="Your progress will appear here once you start a module."
            />
          ) : (
            <ol className="divide-y rounded-md border bg-card">
              {recent.data.map((a) => (
                <li key={a.id} className="p-3">
                  <p className="text-sm font-medium">{ACTIVITY_LABEL[a.action] ?? a.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.module_id ? moduleTitle.get(a.module_id) : ""}
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {formatDate(a.created_at, true)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
