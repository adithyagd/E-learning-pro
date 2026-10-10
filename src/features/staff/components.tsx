import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/states";
import { PerformanceBadge, PerformanceBar } from "@/components/performance/PerformanceBadge";
import { AcademyStatusBadge } from "@/features/candidates/StatusBadges";
import { ACADEMY_STATUS_LABEL } from "@/features/candidates/schema";
import { cn } from "@/lib/utils";
import {
  actionLabel,
  COACHING_CLASS,
  COACHING_LABEL,
  fmtDate,
  fmtDateTime,
  moduleStats,
  modulesCompleted,
  passRate,
  supportReasons,
  type ActivityItem,
  type CoachingStatus,
  type Trainee,
} from "./staff";

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function CoachingBadge({ status }: { status: CoachingStatus | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">No notes</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-medium",
        COACHING_CLASS[status],
      )}
    >
      {COACHING_LABEL[status]}
    </span>
  );
}

export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-md border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Summary cards + module / assessment / support / activity panels shared by both dashboards. */
export function OverviewPanels({
  rows,
  activity,
  sizeLabel,
  detailHref,
}: {
  rows: Trainee[];
  activity: ActivityItem[];
  sizeLabel: string;
  detailHref?: boolean;
}) {
  const stats = moduleStats(rows);
  const rate = passRate(stats);
  const support = rows.filter((r) => supportReasons(r).length > 0);
  const names = new Map(rows.map((r) => [r.user_id, r.full_name || r.candidate_code]));
  const inProgress = rows.filter((r) => r.academy_status === "in_progress").length;
  const completed = rows.filter(
    (r) => r.academy_status === "completed" || r.academy_status === "certified",
  ).length;
  const pending = rows.filter((r) => r.academy_status === "not_started").length;
  const feed = activity.filter((a) => names.has(a.user_id)).slice(0, 12);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label={sizeLabel} value={rows.length} />
        <StatCard label="In progress" value={inProgress} />
        <StatCard label="Completed" value={completed} />
        <StatCard label="Not started" value={pending} />
        <StatCard
          label="Assessment pass rate"
          value={rate == null ? "—" : `${Math.round(rate)}%`}
          hint={
            rate == null
              ? "No assessments attempted yet"
              : "Candidates passed / attempted, all modules"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Section title="Module progress">
          {stats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No module records yet.</p>
          ) : (
            <ul className="space-y-3">
              {stats.map((s) => {
                const pct = rows.length ? (s.completed / rows.length) * 100 : 0;
                return (
                  <li key={s.module_number}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
                      <span className="min-w-0 truncate">
                        <span className="font-medium">Module {s.module_number}</span> · {s.title}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {s.completed}/{rows.length} completed · {s.inProgress} in progress
                      </span>
                    </div>
                    <PerformanceBar value={pct} className="mt-1.5" />
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Assessment performance">
          {stats.every((s) => s.attempts === 0) ? (
            <p className="text-sm text-muted-foreground">
              No module assessments have been submitted yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead className="text-right">Passed</TableHead>
                    <TableHead className="text-right">Pass rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((s) => (
                    <TableRow key={s.module_number}>
                      <TableCell>Module {s.module_number}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.attempts}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.passedCandidates}/{s.attemptedCandidates}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.attemptedCandidates
                          ? `${Math.round((s.passedCandidates / s.attemptedCandidates) * 100)}%`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Section>

        <Section title={`Candidates needing support (${support.length})`}>
          {support.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No candidates currently meet a support criterion (failed latest assessment, inactive
              14+ days while in progress, or overdue coaching follow-up).
            </p>
          ) : (
            <ul className="divide-y">
              {support.map((t) => (
                <li
                  key={t.user_id}
                  className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0 text-sm">
                    {detailHref ? (
                      <Link
                        to="/trainer/candidates/$candidateId"
                        params={{ candidateId: t.user_id }}
                        className="font-medium text-primary hover:underline"
                      >
                        {t.full_name || t.candidate_code}
                      </Link>
                    ) : (
                      <span className="font-medium">{t.full_name || t.candidate_code}</span>
                    )}{" "}
                    <span className="text-muted-foreground">· {t.candidate_code}</span>
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {supportReasons(t).map((r) => (
                      <span
                        key={r}
                        className="inline-flex items-center gap-1 rounded-sm border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs text-warning"
                      >
                        <AlertTriangle className="size-3" aria-hidden /> {r}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Recent activity">
          {feed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recorded activity yet.</p>
          ) : (
            <ul className="divide-y">
              {feed.map((a) => (
                <li key={a.id} className="flex justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium">{names.get(a.user_id)}</span>{" "}
                    <span className="text-muted-foreground">
                      {actionLabel(a.action).toLowerCase()}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {fmtDateTime(a.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

const ALL = "__all";

/** Filterable trainee table. Filters run on already-scoped rows. */
export function TraineeTable({
  rows,
  linkToDetail,
  showTeamFilter,
  showDateFilter,
  showModuleFilter,
}: {
  rows: Trainee[];
  linkToDetail?: boolean;
  showTeamFilter?: boolean;
  showDateFilter?: boolean;
  showModuleFilter?: boolean;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(ALL);
  const [team, setTeam] = useState(ALL);
  const [mod, setMod] = useState(ALL);
  const [coach, setCoach] = useState(ALL);
  const [support, setSupport] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const teams = useMemo(
    () => [
      ...new Map(
        rows.filter((r) => r.team_id).map((r) => [r.team_id!, r.team_name ?? ""]),
      ).entries(),
    ],
    [rows],
  );
  const modules = useMemo(
    () =>
      [
        ...new Map(
          rows.flatMap((r) => r.modules ?? []).map((m) => [m.module_number, m.title]),
        ).entries(),
      ].sort((a, b) => a[0] - b[0]),
    [rows],
  );

  const filtered = rows.filter((r) => {
    const s = q.trim().toLowerCase();
    if (s && ![r.full_name, r.candidate_code, r.email].some((v) => v?.toLowerCase().includes(s)))
      return false;
    if (status !== ALL && r.academy_status !== status) return false;
    if (team !== ALL && (team === "none" ? r.team_id : r.team_id !== team)) return false;
    if (coach !== ALL && (coach === "none" ? r.coaching_status : r.coaching_status !== coach))
      return false;
    if (support && supportReasons(r).length === 0) return false;
    if (from || to) {
      if (!r.last_activity_at) return false;
      const d = r.last_activity_at.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
    }
    return true;
  });
  const modFor = (r: Trainee) =>
    mod === ALL ? null : (r.modules ?? []).find((m) => String(m.module_number) === mod);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Label htmlFor="trainee-search" className="sr-only">
            Search candidates
          </Label>
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden />
          <Input
            id="trainee-search"
            className="pl-8"
            placeholder="Search by name, Candidate ID or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <FilterSelect
          label="Training status"
          value={status}
          onChange={setStatus}
          options={Object.entries(ACADEMY_STATUS_LABEL)}
        />
        <FilterSelect
          label="Coaching status"
          value={coach}
          onChange={setCoach}
          options={[...Object.entries(COACHING_LABEL), ["none", "No notes"]]}
        />
        {showTeamFilter && (
          <FilterSelect
            label="Team"
            value={team}
            onChange={setTeam}
            options={[...teams, ["none", "No team"]]}
          />
        )}
        {showModuleFilter && (
          <FilterSelect
            label="Module"
            value={mod}
            onChange={setMod}
            options={modules.map(([n, t]) => [String(n), `Module ${n} · ${t}`])}
          />
        )}
        {showDateFilter && (
          <>
            <div>
              <Label htmlFor="from" className="text-xs text-muted-foreground">
                Last activity from
              </Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="to" className="text-xs text-muted-foreground">
                Last activity to
              </Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={support}
            onChange={(e) => setSupport(e.target.checked)}
            className="size-4"
          />
          Needs support only
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching candidates"
          description="Change the filters to see more candidates."
        />
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {filtered.map((r) => {
              const m = modFor(r);
              return (
                <li key={r.user_id} className="rounded-md border bg-card p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <NameCell r={r} link={linkToDetail} />
                    <AcademyStatusBadge status={r.academy_status} />
                  </div>
                  <div className="mt-2">
                    <PerformanceBadge
                      value={m ? Number(m.percentage) : Number(r.progress_percent)}
                    />
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <dt>Modules completed</dt>
                    <dd>
                      {modulesCompleted(r)}/{r.modules?.length ?? 0}
                    </dd>
                    <dt>Last activity</dt>
                    <dd>{fmtDate(r.last_activity_at)}</dd>
                    <dt>Coaching</dt>
                    <dd>
                      <CoachingBadge status={r.coaching_status} />
                    </dd>
                    {r.team_name && (
                      <>
                        <dt>Team</dt>
                        <dd>{r.team_name}</dd>
                      </>
                    )}
                  </dl>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto rounded-md border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>{m0(mod) ? `Module ${mod}` : "Status"}</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Modules</TableHead>
                  <TableHead>Assessments</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead>Coaching</TableHead>
                  {showTeamFilter && <TableHead>Team · Trainer</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const m = modFor(r);
                  const passed = (r.modules ?? []).filter((x) => x.assessment_passed).length;
                  return (
                    <TableRow key={r.user_id}>
                      <TableCell>
                        <NameCell r={r} link={linkToDetail} />
                      </TableCell>
                      <TableCell>
                        {m ? (
                          <span className="text-xs">
                            {m.status.replace("_", " ")} · {m.completed_lessons}/{m.total_lessons}{" "}
                            lessons
                          </span>
                        ) : (
                          <AcademyStatusBadge status={r.academy_status} />
                        )}
                      </TableCell>
                      <TableCell>
                        <PerformanceBadge
                          value={m ? Number(m.percentage) : Number(r.progress_percent)}
                        />
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {modulesCompleted(r)}/{r.modules?.length ?? 0}
                      </TableCell>
                      <TableCell className="text-xs">
                        {m ? (
                          m.attempts ? (
                            `${m.assessment_passed ? "Passed" : "Not passed"} · best ${Math.round(Number(m.best_score ?? 0))}%`
                          ) : (
                            "Not attempted"
                          )
                        ) : (
                          <>
                            {passed} module{passed === 1 ? "" : "s"} passed
                            {r.final?.attempts
                              ? ` · Final ${r.final.passed ? "passed" : "not passed"}`
                              : ""}
                          </>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmtDate(r.last_activity_at)}
                      </TableCell>
                      <TableCell>
                        <CoachingBadge status={r.coaching_status} />
                      </TableCell>
                      {showTeamFilter && (
                        <TableCell className="text-xs">
                          {r.team_name ?? "No team"} · {r.trainer_name ?? "No trainer"}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {rows.length} candidate{rows.length === 1 ? "" : "s"}.
          </p>
        </>
      )}
    </div>
  );
}

const m0 = (mod: string) => mod !== ALL;

function NameCell({ r, link }: { r: Trainee; link?: boolean | undefined }) {
  const name = r.full_name || "Unnamed candidate";
  return (
    <div className="min-w-0">
      {link ? (
        <Link
          to="/trainer/candidates/$candidateId"
          params={{ candidateId: r.user_id }}
          className="font-medium text-primary hover:underline"
        >
          {name}
        </Link>
      ) : (
        <span className="font-medium">{name}</span>
      )}
      <p className="text-xs text-muted-foreground">{r.candidate_code}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All · {label}</SelectItem>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
