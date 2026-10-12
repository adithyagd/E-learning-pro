import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/layouts/AppShell";
import { ErrorState, LoadingState } from "@/components/states";
import { traineeOverviewQuery, modulesCompleted } from "@/features/staff/staff";
import { certificateListQuery } from "@/features/certificates/certificates";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — E2E Recruiter Academy" },
      { name: "description", content: "Platform overview." },
      { property: "og:title", content: "Admin Dashboard — E2E Recruiter Academy" },
      { property: "og:description", content: "Platform overview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminDashboard,
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

const LINKS = [
  { to: "/admin/candidates", label: "Candidates" },
  { to: "/admin/progress", label: "Academy progress" },
  { to: "/admin/assessment-results", label: "Assessment results" },
  { to: "/admin/certificates", label: "Certifications" },
  { to: "/admin/modules", label: "Academy modules" },
  { to: "/admin/activity", label: "Activity log" },
] as const;

function AdminDashboard() {
  const rows = useQuery(traineeOverviewQuery());
  const certs = useQuery(certificateListQuery());
  if (rows.isPending || certs.isPending) return <LoadingState label="Loading overview…" />;
  if (rows.isError || certs.isError)
    return <ErrorState description="Overview could not be loaded." onRetry={() => rows.refetch()} />;

  const r = rows.data;
  const c = certs.data;
  const count = (s: string) => c.filter((x) => x.status === s).length;
  const avg = r.length ? r.reduce((s, x) => s + Math.min(100, Number(x.progress_percent) || 0), 0) / r.length : 0;
  const allModules = r.filter((x) => x.modules?.length && modulesCompleted(x) === x.modules.length).length;
  const finalAttempted = r.filter((x) => x.final && x.final.attempts > 0).length;
  const finalPassed = r.filter((x) => x.final?.passed).length;
  const moduleNums = [1, 2, 3, 4, 5];

  return (
    <>
      <PageHeader title="Admin Dashboard" description="Platform overview from recorded academy data." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total candidates" value={r.length} />
        <Stat label="Active candidates" value={r.filter((x) => x.account_status === "active").length} />
        <Stat label="Average completion" value={`${Math.round(avg)}%`} />
        <Stat label="Completed all modules" value={allModules} />
        <Stat label="Final Assessment attempted" value={finalAttempted} />
        <Stat label="Final Assessment passed" value={finalPassed} />
        <Stat label="Certificates pending approval" value={count("pending_approval")} />
        <Stat label="Certificates issued / rejected" value={`${count("issued")} / ${count("rejected")}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="overflow-x-auto rounded-md border bg-card lg:col-span-2">
          <h2 className="px-4 pt-4 text-base font-semibold">Module progress</h2>
          <table className="mt-2 w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                {["Module", "Completed", "In progress", "Assessment passed"].map((h) => (
                  <th key={h} className="px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {moduleNums.map((n) => {
                const ms = r.map((x) => x.modules?.find((m) => m.module_number === n)).filter(Boolean);
                const title = ms[0]?.title;
                return (
                  <tr key={n}>
                    <td className="px-4 py-2">Module {n}{title ? ` — ${title}` : ""}</td>
                    <td className="px-4 py-2 tabular-nums">{ms.filter((m) => m!.status === "completed").length}</td>
                    <td className="px-4 py-2 tabular-nums">{ms.filter((m) => m!.status === "in_progress").length}</td>
                    <td className="px-4 py-2 tabular-nums">{ms.filter((m) => m!.assessment_passed).length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        <section className="rounded-md border bg-card p-4">
          <h2 className="text-base font-semibold">Quick links</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="font-medium text-primary hover:underline">{l.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
