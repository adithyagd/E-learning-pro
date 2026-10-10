import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/layouts/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { CoachingBadge } from "@/features/staff/components";
import { fmtDate, traineeOverviewQuery } from "@/features/staff/staff";

export const Route = createFileRoute("/_authenticated/trainer/coaching")({
  head: () => ({
    meta: [
      { title: "Coaching Follow-ups — E2E Recruiter Academy" },
      {
        name: "description",
        content: "Open coaching items and follow-up dates for your trainees.",
      },
      { property: "og:title", content: "Coaching Follow-ups — E2E Recruiter Academy" },
      { property: "og:description", content: "Open coaching items and follow-up dates." },
    ],
  }),
  component: Coaching,
});

function Coaching() {
  const q = useQuery(traineeOverviewQuery());
  const open = (q.data ?? [])
    .filter((t) => t.open_notes > 0)
    .sort((a, b) => (a.next_follow_up ?? "9999").localeCompare(b.next_follow_up ?? "9999"));
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHeader
        title="Coaching follow-ups"
        description="Trainees with open or in-progress coaching notes, by next follow-up date."
      />
      {q.isPending ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState description={q.error.message} onRetry={() => q.refetch()} />
      ) : open.length === 0 ? (
        <EmptyState
          title="No open coaching items"
          description="Add a coaching note from a trainee's page to track a follow-up."
        />
      ) : (
        <ul className="divide-y rounded-md border bg-card">
          {open.map((t) => (
            <li
              key={t.user_id}
              className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  to="/trainer/candidates/$candidateId"
                  params={{ candidateId: t.user_id }}
                  className="font-medium text-primary hover:underline"
                >
                  {t.full_name || t.candidate_code}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {t.candidate_code} · {t.open_notes} open note{t.open_notes === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CoachingBadge status={t.coaching_status} />
                <span
                  className={
                    t.next_follow_up && t.next_follow_up < today
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }
                >
                  Follow-up: {fmtDate(t.next_follow_up)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
