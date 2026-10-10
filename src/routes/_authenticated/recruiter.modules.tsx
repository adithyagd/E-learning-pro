import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/layouts/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { ModuleCard, ModuleStateBadge } from "@/features/academy/components";
import { finalAssessmentState, overviewQuery } from "@/features/academy/academy";

export const Route = createFileRoute("/_authenticated/recruiter/modules")({
  head: () => ({
    meta: [
      { title: "Academy Modules — E2E Recruiter Academy" },
      { name: "description", content: "Recruitment Fundamentals through Recruitment Operations." },
      { property: "og:title", content: "Academy Modules — E2E Recruiter Academy" },
      {
        property: "og:description",
        content: "Recruitment Fundamentals through Recruitment Operations.",
      },
    ],
  }),
  component: Modules,
});

function Modules() {
  const { session } = Route.useRouteContext();
  const q = useQuery(overviewQuery(session.userId));
  return (
    <>
      <PageHeader
        title="Academy"
        description="Complete each module in order. A module unlocks when the previous one is completed and its assessment is passed."
      />
      {q.isPending ? (
        <LoadingState label="Loading modules…" />
      ) : q.isError ? (
        <ErrorState description="Modules could not be loaded." onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState
          title="No modules available"
          description="Academy modules have not been published yet."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {q.data.map((m) => (
              <ModuleCard key={m.module_id} m={m} />
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border bg-card p-5">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="size-5 text-muted-foreground" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">Final Assessment</p>
                  <p className="text-xs text-muted-foreground">
                    Unlocks after all five modules are completed.
                  </p>
                </div>
              </div>
              <ModuleStateBadge
                state={finalAssessmentState(q.data) === "available" ? "not_started" : "locked"}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border bg-card p-5">
              <div className="flex items-center gap-3">
                <Award className="size-5 text-muted-foreground" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">Certificate</p>
                  <p className="text-xs text-muted-foreground">
                    Issued after passing the Final Assessment and admin approval.
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-muted-foreground">Not available</span>
            </div>
          </div>
        </>
      )}
    </>
  );
}
