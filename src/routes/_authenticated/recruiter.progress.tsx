import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/layouts/AppShell";
import { ErrorState, LoadingState } from "@/components/states";
import { PerformanceBadge, PerformanceBar } from "@/components/performance/PerformanceBadge";
import { ModuleStateBadge } from "@/features/academy/components";
import { overallProgress, overviewQuery } from "@/features/academy/academy";
import { attemptsQuery, finalOverviewQuery } from "@/features/assessments/assessments";
import { fmtDate, myCertificateQuery } from "@/features/certificates/certificates";
import { CertStatusBadge } from "./admin.certificates.index";

export const Route = createFileRoute("/_authenticated/recruiter/progress")({
  head: () => ({
    meta: [
      { title: "Progress — E2E Recruiter Academy" },
      { name: "description", content: "Your academy progress across modules." },
      { property: "og:title", content: "Progress — E2E Recruiter Academy" },
      { property: "og:description", content: "Your academy progress across modules." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const { session } = Route.useRouteContext();
  const mods = useQuery(overviewQuery(session.userId));
  const final = useQuery(finalOverviewQuery(session.userId));
  const cert = useQuery(myCertificateQuery(session.userId));
  const attempts = useQuery(attemptsQuery(session.userId));

  if (mods.isPending || final.isPending || cert.isPending || attempts.isPending)
    return <LoadingState label="Loading your progress…" />;
  if (mods.isError || final.isError || cert.isError || attempts.isError)
    return <ErrorState description="Your progress could not be loaded." onRetry={() => mods.refetch()} />;

  const modules = mods.data;
  const overall = overallProgress(modules);
  const done = modules.filter((m) => m.state === "completed").length;
  const best = new Map<string, number>();
  for (const a of attempts.data)
    if (a.module_id && a.score_percent != null)
      best.set(a.module_id, Math.max(best.get(a.module_id) ?? 0, Number(a.score_percent)));
  const f = final.data;
  const finalAttempts = f.attempts ?? [];
  const finalBest = finalAttempts.reduce<number | null>(
    (b, a) => (a.score_percent == null ? b : Math.max(b ?? 0, Number(a.score_percent))),
    null,
  );
  const finalLabel = f.passed
    ? "Passed"
    : f.eligible
      ? finalAttempts.length
        ? "Not yet passed"
        : "Available"
      : "Locked";

  return (
    <>
      <PageHeader title="Progress" description="Your Recruiter Academy progress across all modules." />
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-md border bg-card p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Overall completion</h2>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{Math.round(overall)}%</p>
          <PerformanceBar value={overall} className="mt-3" />
          <div className="mt-3">
            <PerformanceBadge value={overall} showValue={false} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {done} of {modules.length} modules completed
          </p>
        </section>
        <section className="rounded-md border bg-card p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Final Assessment</h2>
          <p className="mt-2 text-lg font-semibold">{finalLabel}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Attempts: {finalAttempts.length} · Best score: {finalBest == null ? "—" : `${Math.round(finalBest)}%`}
          </p>
          <Link to="/recruiter/final-assessment" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            View Final Assessment
          </Link>
        </section>
        <section className="rounded-md border bg-card p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Certificate</h2>
          <div className="mt-2">
            <CertStatusBadge status={cert.data?.status ?? "not_eligible"} />
          </div>
          {cert.data?.issued_at && (
            <p className="mt-2 text-sm text-muted-foreground">
              {cert.data.certificate_number} · Issued {fmtDate(cert.data.issued_at)}
            </p>
          )}
          <Link to="/recruiter/certificate" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            View certificate
          </Link>
        </section>
      </div>

      <div className="mt-6 overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              {["Module", "Status", "Lessons", "Remaining", "Assessment", "Best score"].map((h) => (
                <th key={h} className="px-4 py-2 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {modules.map((m) => (
              <tr key={m.module_id}>
                <td className="px-4 py-3">
                  {m.state === "locked" ? (
                    <span>Module {m.module_number} — {m.title}</span>
                  ) : (
                    <Link to="/recruiter/module/$moduleId" params={{ moduleId: String(m.module_number) }} className="hover:underline">
                      Module {m.module_number} — {m.title}
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3"><ModuleStateBadge state={m.state} /></td>
                <td className="px-4 py-3 tabular-nums">{m.completed_lessons} / {m.total_lessons}</td>
                <td className="px-4 py-3 tabular-nums">{Math.max(0, m.total_lessons - m.completed_lessons)}</td>
                <td className="px-4 py-3">
                  {!m.requires_assessment ? "Not required" : m.assessment_passed ? "Passed" : best.has(m.module_id) ? "Not yet passed" : "Not attempted"}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {best.has(m.module_id) ? `${Math.round(best.get(m.module_id)!)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
