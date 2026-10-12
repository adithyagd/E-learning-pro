import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/layouts/AppShell";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { PerformanceBar } from "@/components/performance/PerformanceBadge";
import { traineeOverviewQuery } from "@/features/staff/staff";
import { certificateListQuery } from "@/features/certificates/certificates";
import { CertStatusBadge } from "./admin.certificates.index";

export const Route = createFileRoute("/_authenticated/admin/progress")({
  head: () => ({
    meta: [
      { title: "Progress — E2E Recruiter Academy" },
      { name: "description", content: "Academy progress across candidates." },
      { property: "og:title", content: "Progress — E2E Recruiter Academy" },
      { property: "og:description", content: "Academy progress across candidates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminProgress,
});

function AdminProgress() {
  const rows = useQuery(traineeOverviewQuery());
  const certs = useQuery(certificateListQuery());
  const [q, setQ] = useState("");
  const certBy = useMemo(
    () => new Map((certs.data ?? []).map((c) => [c.candidate_id, c.status])),
    [certs.data],
  );
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows.data ?? []).filter(
      (r) => !t || [r.full_name, r.candidate_code, r.email].some((v) => v?.toLowerCase().includes(t)),
    );
  }, [rows.data, q]);

  if (rows.isPending || certs.isPending) return <LoadingState label="Loading progress…" />;
  if (rows.isError || certs.isError)
    return <ErrorState description="Progress could not be loaded." onRetry={() => rows.refetch()} />;

  return (
    <>
      <PageHeader title="Progress" description="Academy progress across candidates, from recorded lesson and assessment data." />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, Candidate ID or email"
        className="mb-4 max-w-sm"
        aria-label="Search candidates"
      />
      {shown.length === 0 ? (
        <EmptyState title="No candidates found" />
      ) : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                {["Candidate", "Completion", "M1", "M2", "M3", "M4", "M5", "Final", "Certificate"].map((h) => (
                  <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {shown.map((r) => {
                const pct = Math.min(100, Number(r.progress_percent) || 0);
                return (
                  <tr key={r.user_id}>
                    <td className="px-3 py-3">
                      <Link to="/admin/candidates/$candidateId" params={{ candidateId: r.user_id }} className="font-medium hover:underline">
                        {r.full_name ?? "—"}
                      </Link>
                      <div className="text-xs text-muted-foreground">{r.candidate_code}</div>
                    </td>
                    <td className="px-3 py-3 min-w-32">
                      <span className="tabular-nums">{Math.round(pct)}%</span>
                      <PerformanceBar value={pct} className="mt-1" />
                    </td>
                    {[1, 2, 3, 4, 5].map((n) => {
                      const m = r.modules?.find((x) => x.module_number === n);
                      return (
                        <td key={n} className="px-3 py-3 whitespace-nowrap text-xs">
                          {m ? (
                            <>
                              <div className="tabular-nums">{m.completed_lessons}/{m.total_lessons} lessons</div>
                              <div className="text-muted-foreground">
                                {m.assessment_passed ? "Passed" : m.attempts > 0 ? "Not passed" : "No attempt"}
                                {m.best_score != null && ` · ${Math.round(Number(m.best_score))}%`}
                              </div>
                            </>
                          ) : "—"}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 whitespace-nowrap text-xs">
                      {r.final?.passed ? "Passed" : r.final && r.final.attempts > 0 ? "Not passed" : "Not attempted"}
                      {r.final?.best_score != null && ` · ${Math.round(Number(r.final.best_score))}%`}
                    </td>
                    <td className="px-3 py-3">
                      <CertStatusBadge status={certBy.get(r.user_id) ?? "not_eligible"} />
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
