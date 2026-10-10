import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/layouts/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { PerformanceBadge } from "@/components/performance/PerformanceBadge";
import { CoachingBadge, Section } from "@/features/staff/components";
import { fmtDate, modulesCompleted, traineeOverviewQuery } from "@/features/staff/staff";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/manager/team")({
  head: () => ({
    meta: [
      { title: "My Teams — E2E Recruiter Academy" },
      {
        name: "description",
        content: "Teams you manage, trainer assignments and coaching status.",
      },
      { property: "og:title", content: "My Teams — E2E Recruiter Academy" },
      { property: "og:description", content: "Teams, trainer assignments and coaching status." },
    ],
  }),
  component: Team,
});

function Team() {
  const teams = useQuery({
    queryKey: ["staff", "my-teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("id, name").order("name");
      if (error) throw new Error("Teams could not be loaded.");
      return data ?? [];
    },
  });
  const rows = useQuery(traineeOverviewQuery());
  return (
    <>
      <PageHeader
        title="My teams"
        description="Trainer assignments and coaching status for your teams. Coaching note content is private to trainers."
      />
      {teams.isPending || rows.isPending ? (
        <LoadingState />
      ) : teams.isError || rows.isError ? (
        <ErrorState
          description="Team data could not be loaded."
          onRetry={() => {
            void teams.refetch();
            void rows.refetch();
          }}
        />
      ) : teams.data.length === 0 ? (
        <EmptyState
          title="No teams assigned"
          description="An administrator has not assigned you to a team yet."
        />
      ) : (
        <div className="space-y-6">
          {teams.data.map((tm) => {
            const members = rows.data.filter((r) => r.team_id === tm.id);
            return (
              <Section
                key={tm.id}
                title={`${tm.name} · ${members.length} candidate${members.length === 1 ? "" : "s"}`}
              >
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No candidates in this team yet.</p>
                ) : (
                  <ul className="divide-y">
                    {members.map((m) => (
                      <li
                        key={m.user_id}
                        className="grid gap-2 py-3 text-sm sm:grid-cols-4 sm:items-center"
                      >
                        <div>
                          <p className="font-medium">{m.full_name || m.candidate_code}</p>
                          <p className="text-xs text-muted-foreground">{m.candidate_code}</p>
                        </div>
                        <p className="text-xs">Trainer: {m.trainer_name ?? "—"}</p>
                        <div className="flex items-center gap-2">
                          <PerformanceBadge value={Number(m.progress_percent)} />
                          <span className="text-xs text-muted-foreground">
                            {modulesCompleted(m)}/{m.modules?.length ?? 0}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <CoachingBadge status={m.coaching_status} />
                          {m.next_follow_up && (
                            <span className="text-muted-foreground">
                              Follow-up {fmtDate(m.next_follow_up)}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            );
          })}
        </div>
      )}
    </>
  );
}
