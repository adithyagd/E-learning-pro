import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/layouts/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { OverviewPanels } from "@/features/staff/components";
import { scopedActivityQuery, traineeOverviewQuery } from "@/features/staff/staff";

export const Route = createFileRoute("/_authenticated/manager/dashboard")({
  head: () => ({
    meta: [
      { title: "Manager Dashboard — E2E Recruiter Academy" },
      { name: "description", content: "Training progress for the teams you manage." },
      { property: "og:title", content: "Manager Dashboard — E2E Recruiter Academy" },
      { property: "og:description", content: "Training progress for the teams you manage." },
    ],
  }),
  component: ManagerDashboard,
});

function ManagerDashboard() {
  const rows = useQuery(traineeOverviewQuery());
  const act = useQuery(scopedActivityQuery());
  return (
    <>
      <PageHeader
        title="Manager dashboard"
        description="Training progress for the teams you are authorised to manage."
      />
      {rows.isPending ? (
        <LoadingState label="Loading team data…" />
      ) : rows.isError ? (
        <ErrorState description={rows.error.message} onRetry={() => rows.refetch()} />
      ) : rows.data.length === 0 ? (
        <EmptyState
          title="No team members yet"
          description="You are not assigned to a team, or your teams have no candidates. An administrator manages team assignments."
        />
      ) : (
        <OverviewPanels rows={rows.data} activity={act.data ?? []} sizeLabel="Team size" />
      )}
    </>
  );
}
