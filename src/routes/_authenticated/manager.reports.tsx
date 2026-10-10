import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/layouts/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { TraineeTable } from "@/features/staff/components";
import { traineeOverviewQuery } from "@/features/staff/staff";

export const Route = createFileRoute("/_authenticated/manager/reports")({
  head: () => ({
    meta: [
      { title: "Team Training Report — E2E Recruiter Academy" },
      { name: "description", content: "Training report for your teams, from recorded data." },
      { property: "og:title", content: "Team Training Report — E2E Recruiter Academy" },
      { property: "og:description", content: "Training report for your teams." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const q = useQuery(traineeOverviewQuery());
  return (
    <>
      <PageHeader
        title="Team training report"
        description="Every figure comes from recorded lesson progress and assessment attempts. The date filter uses each candidate's last recorded activity."
      />
      {q.isPending ? (
        <LoadingState label="Loading report…" />
      ) : q.isError ? (
        <ErrorState description={q.error.message} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState
          title="No training records"
          description="Your teams have no assigned candidates yet."
        />
      ) : (
        <TraineeTable rows={q.data} showTeamFilter showModuleFilter showDateFilter />
      )}
    </>
  );
}
