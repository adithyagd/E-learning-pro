import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/layouts/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { TraineeTable } from "@/features/staff/components";
import { traineeOverviewQuery } from "@/features/staff/staff";

export const Route = createFileRoute("/_authenticated/trainer/trainees")({
  head: () => ({
    meta: [
      { title: "Assigned Trainees — E2E Recruiter Academy" },
      { name: "description", content: "Candidates assigned to you." },
      { property: "og:title", content: "Assigned Trainees — E2E Recruiter Academy" },
      { property: "og:description", content: "Candidates assigned to you." },
    ],
  }),
  component: Trainees,
});

function Trainees() {
  const q = useQuery(traineeOverviewQuery());
  return (
    <>
      <PageHeader
        title="Assigned trainees"
        description="Open a trainee to see their progress and coaching notes."
      />
      {q.isPending ? (
        <LoadingState label="Loading trainees…" />
      ) : q.isError ? (
        <ErrorState description={q.error.message} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState
          title="No trainees assigned"
          description="An administrator has not assigned any candidates to you yet."
        />
      ) : (
        <TraineeTable rows={q.data} linkToDetail showModuleFilter showTeamFilter />
      )}
    </>
  );
}
