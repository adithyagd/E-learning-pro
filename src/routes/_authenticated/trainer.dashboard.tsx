import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/layouts/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { OverviewPanels } from "@/features/staff/components";
import { scopedActivityQuery, traineeOverviewQuery } from "@/features/staff/staff";

export const Route = createFileRoute("/_authenticated/trainer/dashboard")({
  head: () => ({
    meta: [
      { title: "Trainer Dashboard — E2E Recruiter Academy" },
      { name: "description", content: "Training progress for your assigned trainees." },
      { property: "og:title", content: "Trainer Dashboard — E2E Recruiter Academy" },
      { property: "og:description", content: "Training progress for your assigned trainees." },
    ],
  }),
  component: TrainerDashboard,
});

function TrainerDashboard() {
  const rows = useQuery(traineeOverviewQuery());
  const act = useQuery(scopedActivityQuery());
  return (
    <>
      <PageHeader
        title="Trainer dashboard"
        description="Training progress for the candidates assigned to you."
      />
      {rows.isPending ? (
        <LoadingState label="Loading trainees…" />
      ) : rows.isError ? (
        <ErrorState description={rows.error.message} onRetry={() => rows.refetch()} />
      ) : rows.data.length === 0 ? (
        <EmptyState
          title="No trainees assigned"
          description="An administrator has not assigned any candidates to you yet."
        />
      ) : (
        <OverviewPanels
          rows={rows.data}
          activity={act.data ?? []}
          sizeLabel="Assigned trainees"
          detailHref
        />
      )}
    </>
  );
}
