import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/layouts/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Section } from "@/features/staff/components";
import { fmtDate, fmtDateTime, rpcError } from "@/features/staff/staff";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_LABEL,
  ACTIVITY_TYPES,
  ALL_STAGES,
  EXTRA_STAGES,
  INTERVIEW_LABEL,
  INTERVIEW_STATUSES,
  MAIN_STAGES,
  PRIORITIES,
  PRIORITY_LABEL,
  REQ_STATUSES,
  REQ_STATUS_LABEL,
  SECTIONS,
  STAGE_LABEL,
  WITHDRAWN,
  allowedNext,
  assignableStaffQuery,
  inRange,
  isoToIstInput,
  istInputToIso,
  pct,
  recruitmentQuery,
  splitList,
  type ActivityType,
  type Interview,
  type InterviewStatus,
  type Priority,
  type RecArea,
  type RecCandidate,
  type RecData,
  type ReqStatus,
  type Requirement,
  type SectionKey,
  type Stage,
} from "./recruitment";

interface Ctx {
  area: RecArea;
  me: string;
  isAdmin: boolean;
  data: RecData;
  refresh: () => void;
}

const sel =
  "h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function NavLink({ area, s, active }: { area: RecArea; s: SectionKey; active: boolean }) {
  const label = SECTIONS.find((x) => x.key === s)!.label;
  const cls = cn(
    "whitespace-nowrap rounded-md px-3 py-1.5 text-sm",
    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
  );
  if (area === "admin")
    return (
      <Link to="/admin/recruitment/$section" params={{ section: s }} className={cls}>
        {label}
      </Link>
    );
  if (area === "manager")
    return (
      <Link to="/manager/recruitment/$section" params={{ section: s }} className={cls}>
        {label}
      </Link>
    );
  return (
    <Link to="/recruiter/operations/$section" params={{ section: s }} className={cls}>
      {label}
    </Link>
  );
}

export function RecruitmentWorkspace({
  area,
  section,
  me,
  isAdmin,
}: {
  area: RecArea;
  section: SectionKey;
  me: string;
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const q = useQuery(recruitmentQuery());
  const title = SECTIONS.find((s) => s.key === section)!.label;
  const scope =
    area === "admin"
      ? "Organisation-wide recruitment records."
      : area === "manager"
        ? "Recruitment records for the teams you manage (view only)."
        : "Only recruitment work explicitly assigned to you.";
  return (
    <div className="min-w-0">
      <PageHeader title={`Recruitment Operations — ${title}`} description={scope} />
      <nav aria-label="Recruitment sections" className="-mt-2 mb-5 flex flex-wrap gap-1">
        {SECTIONS.map((s) => (
          <NavLink key={s.key} area={area} s={s.key} active={s.key === section} />
        ))}
      </nav>
      {q.isPending ? (
        <LoadingState label="Loading recruitment records…" />
      ) : q.isError ? (
        <ErrorState description={q.error.message} onRetry={() => q.refetch()} />
      ) : (
        <Body
          section={section}
          ctx={{
            area,
            me,
            isAdmin,
            data: q.data,
            refresh: () => qc.invalidateQueries({ queryKey: ["recruitment"] }),
          }}
        />
      )}
    </div>
  );
}

function Body({ section, ctx }: { section: SectionKey; ctx: Ctx }) {
  switch (section) {
    case "dashboard":
      return <Dashboard ctx={ctx} />;
    case "requirements":
      return <Requirements ctx={ctx} />;
    case "pipeline":
      return <Pipeline ctx={ctx} />;
    case "candidates":
      return <Candidates ctx={ctx} />;
    case "activity":
      return <ActivityList ctx={ctx} />;
    case "reports":
      return <Reports ctx={ctx} />;
  }
}

/* ---------- helpers ---------- */

const canEdit = (ctx: Ctx, c: RecCandidate) => {
  if (ctx.isAdmin) return true;
  if (ctx.area === "manager") return false;
  const r = ctx.data.requirements.find((x) => x.id === c.requirement_id);
  return c.recruiter_id === ctx.me || r?.assigned_recruiter_id === ctx.me;
};
const reqName = (ctx: Ctx, id: string | null) => {
  const r = ctx.data.requirements.find((x) => x.id === id);
  return r ? `${r.requirement_code} · ${r.title}` : "No requirement";
};
const person = (ctx: Ctx, id: string | null) =>
  id ? (ctx.data.people.get(id) ?? "Staff member") : "Unassigned";
const Missing = () => <span className="text-xs italic text-muted-foreground">Not provided</span>;
function Verified({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-sm border px-1.5 py-0.5 text-[11px] font-medium",
        ok
          ? "border-success/30 bg-success/10 text-success"
          : "border-warning/40 bg-warning/10 text-warning",
      )}
    >
      {ok ? "Verified" : "Unverified"}
    </span>
  );
}
function StageBadge({ s }: { s: Stage }) {
  const extra = EXTRA_STAGES.includes(s);
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-medium",
        s === "joined"
          ? "border-success/30 bg-success/10 text-success"
          : WITHDRAWN.includes(s)
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : extra
              ? "border-warning/40 bg-warning/10 text-warning"
              : "border-info/30 bg-info/10 text-info",
      )}
    >
      {STAGE_LABEL[s]}
    </span>
  );
}
function Field({ label, children, id }: { label: string; children: ReactNode; id?: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {children}
    </div>
  );
}
function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">{children}</table>
    </div>
  );
}
const th = "border-b px-2 py-2 text-left text-xs font-medium text-muted-foreground";
const td = "border-b px-2 py-2 align-top";

interface Filters {
  req: string;
  team: string;
  stage: string;
  recruiter: string;
  from: string;
  to: string;
  q: string;
}
const EMPTY_F: Filters = { req: "", team: "", stage: "", recruiter: "", from: "", to: "", q: "" };

function FilterBar({
  ctx,
  f,
  set,
  show,
}: {
  ctx: Ctx;
  f: Filters;
  set: (f: Filters) => void;
  show: (keyof Filters)[];
}) {
  const recruiters = [
    ...new Set(ctx.data.candidates.map((c) => c.recruiter_id).filter(Boolean)),
  ] as string[];
  return (
    <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {show.includes("q") && (
        <Field label="Search" id="f-q">
          <Input
            id="f-q"
            value={f.q}
            placeholder="Name, ID, skill…"
            onChange={(e) => set({ ...f, q: e.target.value })}
          />
        </Field>
      )}
      {show.includes("req") && (
        <Field label="Job requirement" id="f-req">
          <select
            id="f-req"
            className={sel}
            value={f.req}
            onChange={(e) => set({ ...f, req: e.target.value })}
          >
            <option value="">All requirements</option>
            {ctx.data.requirements.map((r) => (
              <option key={r.id} value={r.id}>
                {r.requirement_code} · {r.title}
              </option>
            ))}
          </select>
        </Field>
      )}
      {show.includes("team") && (
        <Field label="Team" id="f-team">
          <select
            id="f-team"
            className={sel}
            value={f.team}
            onChange={(e) => set({ ...f, team: e.target.value })}
          >
            <option value="">All authorised teams</option>
            {ctx.data.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {show.includes("recruiter") && (
        <Field label="Recruiter" id="f-rec">
          <select
            id="f-rec"
            className={sel}
            value={f.recruiter}
            onChange={(e) => set({ ...f, recruiter: e.target.value })}
          >
            <option value="">All recruiters</option>
            {recruiters.map((r) => (
              <option key={r} value={r}>
                {person(ctx, r)}
              </option>
            ))}
          </select>
        </Field>
      )}
      {show.includes("stage") && (
        <Field label="Stage" id="f-stage">
          <select
            id="f-stage"
            className={sel}
            value={f.stage}
            onChange={(e) => set({ ...f, stage: e.target.value })}
          >
            <option value="">All stages</option>
            {ALL_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      )}
      {show.includes("from") && (
        <Field label="From date" id="f-from">
          <Input
            id="f-from"
            type="date"
            value={f.from}
            onChange={(e) => set({ ...f, from: e.target.value })}
          />
        </Field>
      )}
      {show.includes("to") && (
        <Field label="To date" id="f-to">
          <Input
            id="f-to"
            type="date"
            value={f.to}
            onChange={(e) => set({ ...f, to: e.target.value })}
          />
        </Field>
      )}
    </div>
  );
}

function filterCandidates(ctx: Ctx, f: Filters) {
  const reqTeam = new Map(ctx.data.requirements.map((r) => [r.id, r.team_id]));
  const s = f.q.trim().toLowerCase();
  return ctx.data.candidates.filter(
    (c) =>
      (!f.req || c.requirement_id === f.req) &&
      (!f.team || (c.requirement_id && reqTeam.get(c.requirement_id) === f.team)) &&
      (!f.stage || c.stage === f.stage) &&
      (!f.recruiter || c.recruiter_id === f.recruiter) &&
      inRange(c.created_at, f.from, f.to) &&
      (!s ||
        [c.full_name, c.candidate_code, c.location ?? "", ...c.skills]
          .join(" ")
          .toLowerCase()
          .includes(s)),
  );
}

/* ---------- Dashboard ---------- */

function Dashboard({ ctx }: { ctx: Ctx }) {
  const [f, setF] = useState(EMPTY_F);
  const cands = filterCandidates(ctx, f);
  const ids = new Set(cands.map((c) => c.id));
  const reqs = ctx.data.requirements.filter(
    (r) => (!f.req || r.id === f.req) && (!f.team || r.team_id === f.team),
  );
  const open = reqs.filter((r) => r.status === "open");
  const withOpenings = open.filter((r) => r.openings != null);
  const now = Date.now();
  const upcoming = ctx.data.interviews.filter(
    (i) =>
      ids.has(i.candidate_id) &&
      ["scheduled", "confirmed", "rescheduled"].includes(i.status) &&
      new Date(i.scheduled_at).getTime() >= now,
  );
  const acts = ctx.data.activities
    .filter((a) => ids.has(a.candidate_id) && inRange(a.occurred_at, f.from, f.to))
    .slice(0, 10);
  const count = (s: Stage) => cands.filter((c) => c.stage === s).length;

  if (!ctx.data.requirements.length && !ctx.data.candidates.length)
    return (
      <EmptyState
        title="No recruitment records yet"
        description={
          ctx.isAdmin
            ? "Create the first job requirement to begin recording recruitment work."
            : "No requirements or candidates have been assigned to you."
        }
      />
    );
  return (
    <div className="space-y-5">
      <FilterBar ctx={ctx} f={f} set={setF} show={["req", "team", "from", "to"]} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active job requirements" value={open.length} hint="Status: Open" />
        <Stat
          label="Open positions"
          value={withOpenings.reduce((n, r) => n + (r.openings ?? 0), 0)}
          hint={
            open.length - withOpenings.length
              ? `${open.length - withOpenings.length} open requirement(s) have no recorded number`
              : "From recorded openings"
          }
        />
        <Stat label="Upcoming interviews" value={upcoming.length} />
        <Stat label="Offers pending" value={count("offered")} hint="Stage: Offered" />
        <Stat label="Joined" value={count("joined")} />
        <Stat
          label="Rejected / withdrawn"
          value={cands.filter((c) => WITHDRAWN.includes(c.stage)).length}
          hint="Rejected, Not Interested, Dropout, Absconded"
        />
        <Stat label="Candidates (filtered)" value={cands.length} />
      </div>
      <Section title="Candidates in each stage">
        {cands.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data available.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {ALL_STAGES.map((s) => (
              <div key={s} className="rounded-md border px-3 py-2">
                <p className="truncate text-xs text-muted-foreground">{STAGE_LABEL[s]}</p>
                <p className="text-lg font-semibold tabular-nums">{count(s)}</p>
              </div>
            ))}
          </div>
        )}
      </Section>
      <Section title="Recent recruitment activity">
        <ActivityTable ctx={ctx} rows={acts} />
      </Section>
    </div>
  );
}

/* ---------- Requirements ---------- */

function Requirements({ ctx }: { ctx: Ctx }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [edit, setEdit] = useState<Requirement | "new" | null>(null);
  const rows = ctx.data.requirements.filter(
    (r) =>
      (!status || r.status === status) &&
      (!q ||
        [r.requirement_code, r.title, r.client_name ?? "", r.location ?? "", ...r.required_skills]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase())),
  );
  const counts = (id: string) => ctx.data.candidates.filter((c) => c.requirement_id === id).length;
  return (
    <Section
      title={`Job requirements (${rows.length})`}
      action={
        ctx.isAdmin && (
          <Button size="sm" onClick={() => setEdit("new")}>
            New requirement
          </Button>
        )
      }
    >
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field label="Search" id="rq-q">
          <Input
            id="rq-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ID, title, client, skill…"
          />
        </Field>
        <Field label="Status" id="rq-s">
          <select
            id="rq-s"
            className={sel}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {REQ_STATUSES.map((s) => (
              <option key={s} value={s}>
                {REQ_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="No job requirements"
          description={
            ctx.isAdmin
              ? "Create a requirement from a confirmed client or internal request."
              : "No requirements are assigned to you or your teams."
          }
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              {[
                "ID",
                "Title",
                "Client",
                "Location",
                "Openings",
                "Priority",
                "Status",
                "Recruiter",
                "Candidates",
                "Updated",
                "",
              ].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={cn(td, "font-mono text-xs")}>{r.requirement_code}</td>
                <td className={td}>
                  <p className="font-medium">{r.title}</p>
                  <Verified ok={r.details_verified} />
                </td>
                <td className={td}>{r.client_name ?? <Missing />}</td>
                <td className={td}>{r.location ?? <Missing />}</td>
                <td className={td}>{r.openings ?? <Missing />}</td>
                <td className={td}>{PRIORITY_LABEL[r.priority]}</td>
                <td className={td}>{REQ_STATUS_LABEL[r.status]}</td>
                <td className={td}>
                  {person(ctx, r.assigned_recruiter_id)}
                  {r.team_id && (
                    <p className="text-xs text-muted-foreground">
                      {ctx.data.teams.find((t) => t.id === r.team_id)?.name ?? "Team"}
                    </p>
                  )}
                </td>
                <td className={td}>{counts(r.id)}</td>
                <td className={td}>{fmtDate(r.updated_at)}</td>
                <td className={td}>
                  <Button size="sm" variant="outline" onClick={() => setEdit(r)}>
                    {ctx.isAdmin ? "Edit" : "View"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      {edit && <RequirementDialog ctx={ctx} req={edit} onClose={() => setEdit(null)} />}
    </Section>
  );
}

function RequirementDialog({
  ctx,
  req,
  onClose,
}: {
  ctx: Ctx;
  req: Requirement | "new";
  onClose: () => void;
}) {
  const r = req === "new" ? null : req;
  const ro = !ctx.isAdmin;
  const staff = useQuery({ ...assignableStaffQuery(), enabled: ctx.isAdmin });
  const [v, setV] = useState({
    title: r?.title ?? "",
    client: r?.client_name ?? "",
    description: r?.description ?? "",
    skills: (r?.required_skills ?? []).join(", "),
    experience: r?.experience ?? "",
    location: r?.location ?? "",
    openings: r?.openings?.toString() ?? "",
    priority: (r?.priority ?? "normal") as Priority,
    status: (r?.status ?? "draft") as ReqStatus,
    team: r?.team_id ?? "",
    recruiter: r?.assigned_recruiter_id ?? "",
    verified: r?.details_verified ?? false,
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!v.title.trim()) return void toast.error("Job title is required.");
    setBusy(true);
    const { error } = await supabase.rpc("save_job_requirement", {
      _id: r?.id ?? (null as unknown as string),
      _title: v.title,
      _client: v.client,
      _description: v.description,
      _skills: splitList(v.skills),
      _experience: v.experience,
      _location: v.location,
      _openings: v.openings ? Number(v.openings) : (null as unknown as number),
      _priority: v.priority,
      _status: v.status,
      _team: v.team || (null as unknown as string),
      _recruiter: v.recruiter || (null as unknown as string),
      _verified: v.verified,
    });
    setBusy(false);
    if (error) return void toast.error(rpcError(error.message));
    toast.success(r ? "Requirement updated." : "Requirement created.");
    ctx.refresh();
    onClose();
  };
  const inp = (k: keyof typeof v, label: string, type = "text") => (
    <Field label={label} id={`rq-${k}`}>
      <Input
        id={`rq-${k}`}
        type={type}
        disabled={ro}
        value={v[k] as string}
        onChange={(e) => setV({ ...v, [k]: e.target.value })}
      />
    </Field>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {r ? `${r.requirement_code} · ${r.title}` : "New job requirement"}
          </DialogTitle>
          <DialogDescription>
            Record only confirmed details. Leave unknown fields empty — they show as “Not provided”.
            The requirement ID is generated automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {inp("title", "Job title *")}
          {inp("client", "Client / employer")}
          {inp("location", "Location")}
          {inp("experience", "Experience requirement")}
          {inp("openings", "Number of openings", "number")}
          {inp("skills", "Required skills (comma-separated)")}
          <Field label="Priority" id="rq-pr">
            <select
              id="rq-pr"
              className={sel}
              disabled={ro}
              value={v.priority}
              onChange={(e) => setV({ ...v, priority: e.target.value as Priority })}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" id="rq-st">
            <select
              id="rq-st"
              className={sel}
              disabled={ro}
              value={v.status}
              onChange={(e) => setV({ ...v, status: e.target.value as ReqStatus })}
            >
              {REQ_STATUSES.map((p) => (
                <option key={p} value={p}>
                  {REQ_STATUS_LABEL[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Authorised team" id="rq-tm">
            <select
              id="rq-tm"
              className={sel}
              disabled={ro}
              value={v.team}
              onChange={(e) => setV({ ...v, team: e.target.value })}
            >
              <option value="">No team</option>
              {ctx.data.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assigned recruiter" id="rq-rc">
            {ro ? (
              <Input id="rq-rc" disabled value={person(ctx, v.recruiter || null)} />
            ) : (
              <select
                id="rq-rc"
                className={sel}
                value={v.recruiter}
                onChange={(e) => setV({ ...v, recruiter: e.target.value })}
              >
                <option value="">Unassigned</option>
                {(staff.data ?? []).map((s) => (
                  <option key={s.user_id} value={s.user_id}>
                    {s.full_name} ({s.role === "candidate" ? "recruiter" : s.role})
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="sm:col-span-2">
            <Field label="Job description" id="rq-desc">
              <Textarea
                id="rq-desc"
                rows={4}
                disabled={ro}
                value={v.description}
                onChange={(e) => setV({ ...v, description: e.target.value })}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              disabled={ro}
              checked={v.verified}
              onChange={(e) => setV({ ...v, verified: e.target.checked })}
            />
            Details verified with the client or hiring owner
          </label>
        </div>
        {r && (
          <p className="text-xs text-muted-foreground">
            Created {fmtDateTime(r.created_at)} · Updated {fmtDateTime(r.updated_at)}. Closing a
            requirement keeps all its candidate history.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {ro ? "Close" : "Cancel"}
          </Button>
          {!ro && (
            <Button onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save requirement"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Pipeline ---------- */

function Pipeline({ ctx }: { ctx: Ctx }) {
  const [f, setF] = useState(EMPTY_F);
  const [view, setView] = useState<"board" | "table">("board");
  const [open, setOpen] = useState<RecCandidate | null>(null);
  const rows = filterCandidates(ctx, f);
  return (
    <div className="space-y-4">
      <FilterBar
        ctx={ctx}
        f={f}
        set={setF}
        show={["q", "req", "recruiter", "team", "stage", "from", "to"]}
      />
      <div className="flex gap-2" role="tablist" aria-label="Pipeline view">
        {(["board", "table"] as const).map((k) => (
          <Button
            key={k}
            size="sm"
            role="tab"
            aria-selected={view === k}
            variant={view === k ? "default" : "outline"}
            onClick={() => setView(k)}
          >
            {k === "board" ? "Stage board" : "Table"}
          </Button>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="No candidates in the pipeline"
          description="Add a candidate from Candidate Profiles to start tracking stages."
        />
      ) : view === "board" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ALL_STAGES.map((s) => {
            const list = rows.filter((c) => c.stage === s);
            if (!list.length && EXTRA_STAGES.includes(s)) return null;
            return (
              <div key={s} className="rounded-md border bg-card">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <span className="text-xs font-semibold">
                    {MAIN_STAGES.includes(s) ? `${MAIN_STAGES.indexOf(s) + 1}. ` : ""}
                    {STAGE_LABEL[s]}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">{list.length}</span>
                </div>
                <ul className="space-y-1 p-2">
                  {list.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setOpen(c)}
                        className="w-full rounded border px-2 py-1.5 text-left text-sm hover:bg-muted"
                      >
                        <span className="block truncate font-medium">{c.full_name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {c.candidate_code} · {reqName(ctx, c.requirement_id)}
                        </span>
                      </button>
                    </li>
                  ))}
                  {!list.length && <li className="px-1 text-xs text-muted-foreground">None</li>}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <CandidateTable ctx={ctx} rows={rows} onOpen={setOpen} />
      )}
      {open && <CandidateDialog ctx={ctx} id={open.id} onClose={() => setOpen(null)} />}
    </div>
  );
}

function CandidateTable({
  ctx,
  rows,
  onOpen,
}: {
  ctx: Ctx;
  rows: RecCandidate[];
  onOpen: (c: RecCandidate) => void;
}) {
  return (
    <TableWrap>
      <thead>
        <tr>
          {["ID", "Name", "Requirement", "Stage", "Recruiter", "Source", "Updated", ""].map((h) => (
            <th key={h} className={th}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.id}>
            <td className={cn(td, "font-mono text-xs")}>{c.candidate_code}</td>
            <td className={td}>
              <p className="font-medium">{c.full_name}</p>
              <Verified ok={c.details_verified} />
            </td>
            <td className={td}>{reqName(ctx, c.requirement_id)}</td>
            <td className={td}>
              <StageBadge s={c.stage} />
            </td>
            <td className={td}>{person(ctx, c.recruiter_id)}</td>
            <td className={td}>{c.source}</td>
            <td className={td}>{fmtDate(c.updated_at)}</td>
            <td className={td}>
              <Button size="sm" variant="outline" onClick={() => onOpen(c)}>
                Open
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

/* ---------- Candidates ---------- */

function Candidates({ ctx }: { ctx: Ctx }) {
  const [f, setF] = useState(EMPTY_F);
  const [open, setOpen] = useState<RecCandidate | null>(null);
  const [adding, setAdding] = useState(false);
  const rows = filterCandidates(ctx, f);
  const mayAdd =
    ctx.isAdmin ||
    (ctx.area === "candidate" &&
      ctx.data.requirements.some((r) => r.assigned_recruiter_id === ctx.me));
  return (
    <Section
      title={`Candidate profiles (${rows.length})`}
      action={
        mayAdd && (
          <Button size="sm" onClick={() => setAdding(true)}>
            Add candidate
          </Button>
        )
      }
    >
      <p className="mb-3 text-xs text-muted-foreground">
        Recruitment candidates are separate from Recruiter Academy trainees. Training accounts never
        appear here.
      </p>
      <FilterBar ctx={ctx} f={f} set={setF} show={["q", "req", "stage", "recruiter"]} />
      {rows.length === 0 ? (
        <EmptyState
          title="No recruitment candidates"
          description={
            mayAdd
              ? "Add a candidate only from a legitimate source such as a received application or referral."
              : "No candidates are visible to you."
          }
        />
      ) : (
        <CandidateTable ctx={ctx} rows={rows} onOpen={setOpen} />
      )}
      {open && <CandidateDialog ctx={ctx} id={open.id} onClose={() => setOpen(null)} />}
      {adding && <CandidateForm ctx={ctx} onClose={() => setAdding(false)} />}
    </Section>
  );
}

function CandidateForm({
  ctx,
  cand,
  onClose,
}: {
  ctx: Ctx;
  cand?: RecCandidate;
  onClose: () => void;
}) {
  const staff = useQuery({ ...assignableStaffQuery(), enabled: ctx.isAdmin });
  const reqs = ctx.isAdmin
    ? ctx.data.requirements
    : ctx.data.requirements.filter((r) => r.assigned_recruiter_id === ctx.me);
  const [v, setV] = useState({
    name: cand?.full_name ?? "",
    email: cand?.email ?? "",
    phone: cand?.phone ?? "",
    contactVerified: cand?.contact_verified ?? false,
    skills: (cand?.skills ?? []).join(", "),
    experience: cand?.experience ?? "",
    location: cand?.location ?? "",
    source: cand?.source ?? "",
    verified: cand?.details_verified ?? false,
    req: cand?.requirement_id ?? reqs[0]?.id ?? "",
    recruiter: cand?.recruiter_id ?? "",
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!v.name.trim() || !v.source.trim())
      return void toast.error("Name and source of the record are required.");
    setBusy(true);
    const { error } = await supabase.rpc("save_recruitment_candidate", {
      _id: cand?.id ?? (null as unknown as string),
      _name: v.name,
      _email: v.email,
      _phone: v.phone,
      _contact_verified: v.contactVerified,
      _skills: splitList(v.skills),
      _experience: v.experience,
      _location: v.location,
      _source: v.source,
      _details_verified: v.verified,
      _requirement: v.req || (null as unknown as string),
      _recruiter: v.recruiter || (null as unknown as string),
    });
    setBusy(false);
    if (error) return void toast.error(rpcError(error.message));
    toast.success(cand ? "Candidate updated." : "Candidate added at stage Sourced.");
    ctx.refresh();
    onClose();
  };
  const inp = (k: keyof typeof v, label: string, type = "text") => (
    <Field label={label} id={`cf-${k}`}>
      <Input
        id={`cf-${k}`}
        type={type}
        value={v[k] as string}
        onChange={(e) => setV({ ...v, [k]: e.target.value })}
      />
    </Field>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {cand ? `Edit ${cand.candidate_code}` : "Add recruitment candidate"}
          </DialogTitle>
          <DialogDescription>
            Enter only information legitimately provided by the candidate or a verified source.
            Never guess contact details or work history.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {inp("name", "Full name *")}
          {inp("source", "Source of record * (e.g. referral, application)")}
          {inp("email", "Email", "email")}
          {inp("phone", "Phone", "tel")}
          {inp("location", "Location")}
          {inp("experience", "Experience")}
          <div className="sm:col-span-2">{inp("skills", "Skills (comma-separated)")}</div>
          <Field label="Job requirement" id="cf-req">
            <select
              id="cf-req"
              className={sel}
              value={v.req}
              onChange={(e) => setV({ ...v, req: e.target.value })}
            >
              {ctx.isAdmin && <option value="">No requirement</option>}
              {reqs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.requirement_code} · {r.title}
                </option>
              ))}
            </select>
          </Field>
          {ctx.isAdmin && (
            <Field label="Assigned recruiter" id="cf-rec">
              <select
                id="cf-rec"
                className={sel}
                value={v.recruiter}
                onChange={(e) => setV({ ...v, recruiter: e.target.value })}
              >
                <option value="">Unassigned</option>
                {(staff.data ?? []).map((s) => (
                  <option key={s.user_id} value={s.user_id}>
                    {s.full_name} ({s.role === "candidate" ? "recruiter" : s.role})
                  </option>
                ))}
              </select>
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={v.contactVerified}
              onChange={(e) => setV({ ...v, contactVerified: e.target.checked })}
            />
            Contact details verified
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={v.verified}
              onChange={(e) => setV({ ...v, verified: e.target.checked })}
            />
            Skills / experience verified
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save candidate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CandidateDialog({ ctx, id, onClose }: { ctx: Ctx; id: string; onClose: () => void }) {
  const c = ctx.data.candidates.find((x) => x.id === id);
  const [mode, setMode] = useState<"" | "edit" | "stage" | "activity" | "interview">("");
  const [iv, setIv] = useState<Interview | null>(null);
  if (!c) return null;
  const editable = canEdit(ctx, c);
  const history = ctx.data.history.filter((h) => h.candidate_id === c.id);
  const acts = ctx.data.activities.filter((a) => a.candidate_id === c.id);
  const ivs = ctx.data.interviews.filter((i) => i.candidate_id === c.id);
  const openResume = async () => {
    if (!c.resume_path) return;
    const { data, error } = await supabase.storage
      .from("recruitment-resumes")
      .createSignedUrl(c.resume_path, 60);
    if (error || !data) return void toast.error("Resume could not be opened.");
    window.open(data.signedUrl, "_blank", "noopener");
  };
  const upload = async (file: File) => {
    const ok = /\.(pdf|docx?)$/i.test(file.name);
    if (!ok) return void toast.error("Upload a PDF or Word document.");
    if (file.size > 5 * 1024 * 1024) return void toast.error("The file must be 5 MB or smaller.");
    const path = `${c.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await supabase.storage.from("recruitment-resumes").upload(path, file);
    if (up.error) return void toast.error("Resume upload failed.");
    const { error } = await supabase.rpc("set_recruitment_resume", {
      _candidate: c.id,
      _path: path,
    });
    if (error) return void toast.error(rpcError(error.message));
    toast.success("Resume stored securely.");
    ctx.refresh();
  };
  const row = (label: string, v: ReactNode) => (
    <div className="grid grid-cols-3 gap-2 border-b py-1.5 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 min-w-0 break-words">{v}</dd>
    </div>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {c.full_name} <span className="font-mono text-sm">({c.candidate_code})</span>
          </DialogTitle>
          <DialogDescription>
            {editable
              ? "You may update this record."
              : "View only — you cannot change this record."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <StageBadge s={c.stage} />
          <Verified ok={c.details_verified} />
        </div>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setMode("stage")}>
              Change stage
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMode("activity")}>
              Record activity
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIv(null);
                setMode("interview");
              }}
            >
              Schedule interview
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMode("edit")}>
              Edit details
            </Button>
          </div>
        )}
        <dl>
          {row("Requirement", reqName(ctx, c.requirement_id))}
          {row("Recruiter", person(ctx, c.recruiter_id))}
          {row(
            "Email",
            c.email ? (
              <>
                {c.email} <Verified ok={c.contact_verified} />
              </>
            ) : (
              <Missing />
            ),
          )}
          {row(
            "Phone",
            c.phone ? (
              <>
                {c.phone} <Verified ok={c.contact_verified} />
              </>
            ) : (
              <Missing />
            ),
          )}
          {row("Skills", c.skills.length ? c.skills.join(", ") : <Missing />)}
          {row("Experience", c.experience ?? <Missing />)}
          {row("Location", c.location ?? <Missing />)}
          {row("Source", c.source)}
          {row(
            "Resume",
            <div className="flex flex-wrap items-center gap-2">
              {c.resume_path ? (
                <Button size="sm" variant="outline" onClick={openResume}>
                  Open resume
                </Button>
              ) : (
                <Missing />
              )}
              {editable && (
                <label className="cursor-pointer text-xs text-primary underline">
                  Upload PDF/Word (max 5 MB)
                  <input
                    type="file"
                    className="sr-only"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                  />
                </label>
              )}
            </div>,
          )}
          {row("Created", fmtDateTime(c.created_at))}
          {row("Updated", fmtDateTime(c.updated_at))}
        </dl>
        <Section title="Interviews">
          {ivs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interviews recorded.</p>
          ) : (
            <ul className="space-y-2">
              {ivs.map((i) => (
                <li key={i.id} className="rounded border p-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {i.round} · {fmtDateTime(i.scheduled_at)} IST
                    </span>
                    <span className="text-xs">{INTERVIEW_LABEL[i.status]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Interviewer: {i.interviewer ?? "Not recorded"}
                    {i.outcome ? ` · Outcome: ${i.outcome}` : ""}
                  </p>
                  {editable && (
                    <Button
                      size="sm"
                      variant="link"
                      className="h-auto p-0"
                      onClick={() => {
                        setIv(i);
                        setMode("interview");
                      }}
                    >
                      Update / reschedule
                    </Button>
                  )}
                  <InterviewHistory id={i.id} />
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Stage history">
          <ul className="space-y-1 text-sm">
            {history.map((h) => (
              <li key={h.id}>
                {fmtDateTime(h.changed_at)} —{" "}
                {h.from_stage ? `${STAGE_LABEL[h.from_stage]} → ` : ""}
                <strong>{STAGE_LABEL[h.to_stage]}</strong> by {person(ctx, h.changed_by)}
                {h.note ? <span className="text-muted-foreground"> · {h.note}</span> : null}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Activity">
          <ActivityTable ctx={ctx} rows={acts} hideCandidate />
        </Section>
        {mode === "stage" && <StageDialog ctx={ctx} c={c} onClose={() => setMode("")} />}
        {mode === "activity" && <ActivityDialog ctx={ctx} c={c} onClose={() => setMode("")} />}
        {mode === "interview" && (
          <InterviewDialog ctx={ctx} c={c} iv={iv} onClose={() => setMode("")} />
        )}
        {mode === "edit" && <CandidateForm ctx={ctx} cand={c} onClose={() => setMode("")} />}
      </DialogContent>
    </Dialog>
  );
}

function InterviewHistory({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ["recruitment", "iv-events", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_interview_events")
        .select("*")
        .eq("interview_id", id)
        .order("changed_at");
      if (error) throw error;
      return data;
    },
  });
  if (!q.data || q.data.length < 2) return null;
  return (
    <details className="mt-1 text-xs text-muted-foreground">
      <summary className="cursor-pointer">History ({q.data.length})</summary>
      <ul className="mt-1 space-y-0.5">
        {q.data.map((e) => (
          <li key={e.id}>
            {fmtDateTime(e.changed_at)}:{" "}
            {e.previous_status ? INTERVIEW_LABEL[e.previous_status] : "Created"} →{" "}
            {INTERVIEW_LABEL[e.new_status]}
            {e.previous_scheduled_at && e.previous_scheduled_at !== e.new_scheduled_at
              ? ` (moved from ${fmtDateTime(e.previous_scheduled_at)} to ${fmtDateTime(e.new_scheduled_at)})`
              : ""}
          </li>
        ))}
      </ul>
    </details>
  );
}

function StageDialog({ ctx, c, onClose }: { ctx: Ctx; c: RecCandidate; onClose: () => void }) {
  const options = allowedNext(c.stage);
  const [to, setTo] = useState<Stage | "">(options[0] ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!to) return;
    setBusy(true);
    const { error } = await supabase.rpc("change_recruitment_stage", {
      _candidate: c.id,
      _to: to,
      _note: note,
    });
    setBusy(false);
    if (error) return void toast.error(rpcError(error.message));
    toast.success(`Stage changed to ${STAGE_LABEL[to]}.`);
    ctx.refresh();
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change stage</DialogTitle>
          <DialogDescription>
            Current stage: {STAGE_LABEL[c.stage]}. Main stages move forward only; exceptional
            statuses can be set where they apply. Every change is recorded in history.
          </DialogDescription>
        </DialogHeader>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {STAGE_LABEL[c.stage]} is a closed status; no further changes are allowed.
          </p>
        ) : (
          <div className="space-y-3">
            <Field label="New stage" id="sd-to">
              <select
                id="sd-to"
                className={sel}
                value={to}
                onChange={(e) => setTo(e.target.value as Stage)}
              >
                {options.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Reason / evidence (recommended)" id="sd-n">
              <Textarea id="sd-n" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {options.length > 0 && (
            <Button onClick={save} disabled={busy || !to}>
              {busy ? "Saving…" : "Confirm change"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActivityDialog({ ctx, c, onClose }: { ctx: Ctx; c: RecCandidate; onClose: () => void }) {
  const [type, setType] = useState<ActivityType>("contacted");
  const [when, setWhen] = useState(isoToIstInput(new Date().toISOString()));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("record_recruitment_activity", {
      _candidate: c.id,
      _type: type,
      _occurred: istInputToIso(when),
      _notes: notes,
    });
    setBusy(false);
    if (error) return void toast.error(rpcError(error.message));
    toast.success("Activity recorded.");
    ctx.refresh();
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record activity</DialogTitle>
          <DialogDescription>
            Record only something that actually happened. No message is sent to the candidate.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Activity" id="ad-t">
            <select
              id="ad-t"
              className={sel}
              value={type}
              onChange={(e) => setType(e.target.value as ActivityType)}
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACTIVITY_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date and time (IST)" id="ad-w">
            <Input
              id="ad-w"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </Field>
          <Field label="Notes" id="ad-n">
            <Textarea id="ad-n" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy || !when}>
            {busy ? "Saving…" : "Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InterviewDialog({
  ctx,
  c,
  iv,
  onClose,
}: {
  ctx: Ctx;
  c: RecCandidate;
  iv: Interview | null;
  onClose: () => void;
}) {
  const [v, setV] = useState({
    when: iv ? isoToIstInput(iv.scheduled_at) : "",
    round: iv?.round ?? "",
    interviewer: iv?.interviewer ?? "",
    status: (iv?.status ?? "scheduled") as InterviewStatus,
    outcome: iv?.outcome ?? "",
    notes: iv?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const statuses = iv ? INTERVIEW_STATUSES : (["scheduled", "confirmed"] as InterviewStatus[]);
  const save = async () => {
    if (!v.when || !v.round.trim()) return void toast.error("Date, time and round are required.");
    setBusy(true);
    const { error } = await supabase.rpc("save_recruitment_interview", {
      _id: iv?.id ?? (null as unknown as string),
      _candidate: c.id,
      _scheduled: istInputToIso(v.when),
      _round: v.round,
      _interviewer: v.interviewer,
      _status: v.status,
      _outcome: v.status === "completed" ? v.outcome : "",
      _notes: v.notes,
    });
    setBusy(false);
    if (error) return void toast.error(rpcError(error.message));
    toast.success(iv ? "Interview updated." : "Interview recorded.");
    ctx.refresh();
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{iv ? "Update interview" : "Schedule interview"}</DialogTitle>
          <DialogDescription>
            This records the interview only. No calendar invitation or reminder is sent. Changing
            the time marks it Rescheduled and keeps the previous time in history.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Date and time (IST) *" id="iv-w">
            <Input
              id="iv-w"
              type="datetime-local"
              value={v.when}
              onChange={(e) => setV({ ...v, when: e.target.value })}
            />
          </Field>
          <Field label="Round *" id="iv-r">
            <Input
              id="iv-r"
              value={v.round}
              placeholder="e.g. Technical round 1"
              onChange={(e) => setV({ ...v, round: e.target.value })}
            />
          </Field>
          <Field label="Interviewer" id="iv-i">
            <Input
              id="iv-i"
              value={v.interviewer}
              onChange={(e) => setV({ ...v, interviewer: e.target.value })}
            />
          </Field>
          <Field label="Status" id="iv-s">
            <select
              id="iv-s"
              className={sel}
              value={v.status}
              onChange={(e) => setV({ ...v, status: e.target.value as InterviewStatus })}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {INTERVIEW_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          {v.status === "completed" && (
            <div className="sm:col-span-2">
              <Field label="Outcome" id="iv-o">
                <Input
                  id="iv-o"
                  value={v.outcome}
                  onChange={(e) => setV({ ...v, outcome: e.target.value })}
                />
              </Field>
            </div>
          )}
          <div className="sm:col-span-2">
            <Field label="Notes" id="iv-n">
              <Textarea
                id="iv-n"
                rows={2}
                value={v.notes}
                onChange={(e) => setV({ ...v, notes: e.target.value })}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save interview"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Activity ---------- */

function ActivityTable({
  ctx,
  rows,
  hideCandidate,
}: {
  ctx: Ctx;
  rows: RecData["activities"];
  hideCandidate?: boolean;
}) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">No activity recorded.</p>;
  const names = new Map(ctx.data.candidates.map((c) => [c.id, c]));
  return (
    <ul className="divide-y text-sm">
      {rows.map((a) => {
        const c = names.get(a.candidate_id);
        return (
          <li key={a.id} className="py-2">
            <div className="flex flex-wrap justify-between gap-x-3">
              <span className="font-medium">{ACTIVITY_LABEL[a.activity_type]}</span>
              <span className="text-xs text-muted-foreground">{fmtDateTime(a.occurred_at)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {!hideCandidate && c ? `${c.full_name} (${c.candidate_code}) · ` : ""}
              {reqName(ctx, a.requirement_id)} · recorded by {person(ctx, a.recorded_by)}
            </p>
            {a.notes && <p className="mt-0.5 break-words">{a.notes}</p>}
          </li>
        );
      })}
    </ul>
  );
}

function ActivityList({ ctx }: { ctx: Ctx }) {
  const [f, setF] = useState(EMPTY_F);
  const [type, setType] = useState("");
  const rows = ctx.data.activities.filter(
    (a) =>
      (!f.req || a.requirement_id === f.req) &&
      (!type || a.activity_type === type) &&
      inRange(a.occurred_at, f.from, f.to),
  );
  return (
    <Section title={`Recruitment activity (${rows.length})`}>
      <p className="mb-3 text-xs text-muted-foreground">
        Activities are recorded from a candidate profile by the assigned recruiter or an admin.
      </p>
      <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Activity type" id="al-t">
          <select id="al-t" className={sel} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All activity</option>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACTIVITY_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <FilterBar ctx={ctx} f={f} set={setF} show={["req", "from", "to"]} />
      <ActivityTable ctx={ctx} rows={rows} />
    </Section>
  );
}

/* ---------- Reports ---------- */

function CountTable({ rows, total }: { rows: [string, number][]; total?: number }) {
  if (!rows.length || rows.every(([, n]) => n === 0))
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  return (
    <TableWrap>
      <tbody>
        {rows.map(([k, n]) => (
          <tr key={k}>
            <td className={td}>{k}</td>
            <td className={cn(td, "text-right tabular-nums")}>{n}</td>
            {total !== undefined && (
              <td className={cn(td, "text-right tabular-nums text-muted-foreground")}>
                {pct(n, total)}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

function Reports({ ctx }: { ctx: Ctx }) {
  const [f, setF] = useState(EMPTY_F);
  const cands = filterCandidates(ctx, f);
  const ids = new Set(cands.map((c) => c.id));
  const stats = useMemo(() => {
    const hist = ctx.data.history.filter((h) => ids.has(h.candidate_id));
    const reached = (s: Stage) =>
      new Set(hist.filter((h) => h.to_stage === s).map((h) => h.candidate_id));
    const offered = reached("offered");
    const accepted = new Set([...reached("offer_accepted")].filter((x) => offered.has(x)));
    const ivs = ctx.data.interviews.filter(
      (i) => ids.has(i.candidate_id) && inRange(i.scheduled_at, f.from, f.to),
    );
    const acts = ctx.data.activities.filter(
      (a) => ids.has(a.candidate_id) && inRange(a.occurred_at, f.from, f.to),
    );
    const byRec = new Map<string, number>();
    for (const a of acts) {
      const k = person(ctx, a.recorded_by);
      byRec.set(k, (byRec.get(k) ?? 0) + 1);
    }
    return { offered, accepted, ivs, byRec };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.data, cands, f.from, f.to]);
  const total = cands.length;
  return (
    <div className="space-y-4">
      <FilterBar ctx={ctx} f={f} set={setF} show={["req", "team", "from", "to"]} />
      <p className="text-xs text-muted-foreground">
        Date filter applies to candidate creation date, interview date and activity date.
        Percentages use the number of candidates in the filtered set ({total}). No export is
        provided for private candidate information.
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Candidates by pipeline stage">
          <CountTable
            total={total}
            rows={ALL_STAGES.map((s) => [
              STAGE_LABEL[s],
              cands.filter((c) => c.stage === s).length,
            ])}
          />
        </Section>
        <Section title="Candidates by job requirement">
          <CountTable
            total={total}
            rows={[
              ...ctx.data.requirements.map(
                (r) =>
                  [
                    `${r.requirement_code} · ${r.title}`,
                    cands.filter((c) => c.requirement_id === r.id).length,
                  ] as [string, number],
              ),
              ["No requirement", cands.filter((c) => !c.requirement_id).length] as [string, number],
            ].filter(([, n]) => n > 0)}
          />
        </Section>
        <Section title="Interview outcomes (by status)">
          <CountTable
            total={stats.ivs.length}
            rows={INTERVIEW_STATUSES.map((s) => [
              INTERVIEW_LABEL[s],
              stats.ivs.filter((i) => i.status === s).length,
            ])}
          />
        </Section>
        <Section title="Offers and acceptance">
          {stats.offered.size === 0 ? (
            <p className="text-sm text-muted-foreground">No data available.</p>
          ) : (
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>Candidates who reached Offered</dt>
                <dd className="tabular-nums">{stats.offered.size}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Of those, reached Offer Accepted</dt>
                <dd className="tabular-nums">{stats.accepted.size}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Acceptance rate</dt>
                <dd className="tabular-nums">{pct(stats.accepted.size, stats.offered.size)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Currently Joined</dt>
                <dd className="tabular-nums">{cands.filter((c) => c.stage === "joined").length}</dd>
              </div>
            </dl>
          )}
        </Section>
        <Section title="Rejections and withdrawals">
          <CountTable
            total={total}
            rows={WITHDRAWN.map((s) => [STAGE_LABEL[s], cands.filter((c) => c.stage === s).length])}
          />
        </Section>
        <Section title="Recorded activity by recruiter">
          <CountTable rows={[...stats.byRec.entries()].sort((a, b) => b[1] - a[1])} />
        </Section>
      </div>
    </div>
  );
}
