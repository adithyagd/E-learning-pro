import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/layouts/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { supabase } from "@/integrations/supabase/client";
import { ATTEMPT_STATUS_LABEL, fmtDuration } from "@/features/assessments/assessments";

export const Route = createFileRoute("/_authenticated/admin/assessment-results")({
  head: () => ({
    meta: [
      { title: "Assessment Results — E2E Recruiter Academy" },
      { name: "description", content: "Candidate assessment attempts and scores." },
      { property: "og:title", content: "Assessment Results — E2E Recruiter Academy" },
      { property: "og:description", content: "Candidate assessment attempts and scores." },
    ],
  }),
  component: Results,
});

function Results() {
  const q = useQuery({
    queryKey: ["admin", "assessment-results"],
    queryFn: async () => {
      const [a, p, m] = await Promise.all([
        supabase
          .from("assessment_attempts")
          .select(
            "id, candidate_id, module_id, attempt_number, status, score_percent, correct_count, question_count, duration_seconds, started_at, submitted_at",
          )
          .order("started_at", { ascending: false })
          .limit(200),
        supabase.from("profiles").select("id, full_name, email"),
        supabase.from("academy_modules").select("id, module_number"),
      ]);
      if (a.error || p.error || m.error) throw new Error("load");
      return {
        attempts: a.data,
        people: new Map(p.data.map((x) => [x.id, x])),
        mods: new Map(m.data.map((x) => [x.id, x.module_number])),
      };
    },
  });
  if (q.isPending) return <LoadingState />;
  if (q.isError) return <ErrorState description="Results could not be loaded." />;
  const { attempts, people, mods } = q.data;

  return (
    <>
      <PageHeader
        title="Assessment Results"
        description="Latest 200 attempts. Scores are system-calculated and read-only."
      />
      {attempts.length === 0 ? (
        <EmptyState title="No attempts yet" />
      ) : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                {[
                  "Candidate",
                  "Module",
                  "Attempt",
                  "Score",
                  "Result",
                  "Time",
                  "Started",
                  "Submitted",
                ].map((h) => (
                  <th key={h} className="px-4 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => {
                const p = people.get(a.candidate_id);
                return (
                  <tr key={a.id} className="border-t">
                    <td className="px-4 py-2">{p?.full_name || p?.email || "—"}</td>
                    <td className="px-4 py-2">
                      {a.module_id ? `M${mods.get(a.module_id)}` : "Final"}
                    </td>
                    <td className="px-4 py-2">#{a.attempt_number}</td>
                    <td className="px-4 py-2 tabular-nums">
                      {a.score_percent == null
                        ? "—"
                        : `${Math.round(Number(a.score_percent))}% (${a.correct_count}/${a.question_count})`}
                    </td>
                    <td className="px-4 py-2">{ATTEMPT_STATUS_LABEL[a.status]}</td>
                    <td className="px-4 py-2">{fmtDuration(a.duration_seconds)}</td>
                    <td className="px-4 py-2">{new Date(a.started_at).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
