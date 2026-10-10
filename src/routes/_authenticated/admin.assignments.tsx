import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/layouts/AppShell";
import { ConfirmationDialog, ErrorState, LoadingState } from "@/components/states";
import { Section } from "@/features/staff/components";
import { fmtDate, rpcError } from "@/features/staff/staff";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/assignments")({
  head: () => ({
    meta: [
      { title: "Teams & Assignments — E2E Recruiter Academy" },
      { name: "description", content: "Assign trainers to candidates and managers to teams." },
      { property: "og:title", content: "Teams & Assignments — E2E Recruiter Academy" },
      {
        property: "og:description",
        content: "Assign trainers to candidates and managers to teams.",
      },
    ],
  }),
  component: Assignments,
});

const NONE = "__none";

function useAdminData() {
  return useQuery({
    queryKey: ["admin", "assignments"],
    queryFn: async () => {
      const [roles, teams, tms, asg, cands] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").in("role", ["trainer", "manager"]),
        supabase.from("teams").select("id, name, created_at").order("name"),
        supabase.from("team_managers").select("team_id, manager_id"),
        supabase
          .from("trainee_assignments")
          .select("candidate_id, trainer_id, team_id, assigned_at")
          .eq("status", "active"),
        supabase.from("candidate_profiles").select("user_id, employee_id"),
      ]);
      const err = [roles, teams, tms, asg, cands].find((r) => r.error);
      if (err) throw new Error("Assignment data could not be loaded.");
      const ids = [
        ...new Set([
          ...(roles.data ?? []).map((r) => r.user_id),
          ...(cands.data ?? []).map((c) => c.user_id),
        ]),
      ];
      const { data: profs, error } = ids.length
        ? await supabase
            .from("profiles")
            .select("id, full_name, email, account_status")
            .in("id", ids)
        : { data: [], error: null };
      if (error) throw new Error("Assignment data could not be loaded.");
      const p = new Map((profs ?? []).map((x) => [x.id, x]));
      const name = (id: string) => p.get(id)?.full_name || p.get(id)?.email || "Unknown";
      return {
        name,
        trainers: (roles.data ?? []).filter((r) => r.role === "trainer").map((r) => r.user_id),
        managers: (roles.data ?? []).filter((r) => r.role === "manager").map((r) => r.user_id),
        teams: teams.data ?? [],
        teamManagers: tms.data ?? [],
        assignments: asg.data ?? [],
        candidates: (cands.data ?? []).map((c) => ({
          id: c.user_id,
          code: c.employee_id,
          status: p.get(c.user_id)?.account_status,
        })),
      };
    },
  });
}

function Assignments() {
  const q = useAdminData();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "assignments"] });
  const [teamName, setTeamName] = useState("");
  const [cand, setCand] = useState("");
  const [trainer, setTrainer] = useState("");
  const [team, setTeam] = useState(NONE);
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState<string | null>(null);
  const [mgrPick, setMgrPick] = useState<Record<string, string>>({});

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) return (toast.error(rpcError(error.message)), false);
    toast.success(ok);
    await refresh();
    return true;
  }

  if (q.isPending) return <LoadingState label="Loading assignments…" />;
  if (q.isError) return <ErrorState description={q.error.message} onRetry={() => q.refetch()} />;
  const d = q.data;
  const teamName_ = (id: string | null) => d.teams.find((t) => t.id === id)?.name ?? "No team";

  return (
    <>
      <PageHeader
        title="Teams & assignments"
        description="Trainers see only the candidates assigned to them; managers see only candidates in teams they manage."
      />
      {(d.trainers.length === 0 || d.managers.length === 0) && (
        <p className="mb-4 rounded-sm border border-info/30 bg-info/10 px-3 py-2 text-sm text-info">
          {d.trainers.length === 0 ? "No trainer accounts exist yet. " : ""}
          {d.managers.length === 0 ? "No manager accounts exist yet. " : ""}
          Staff accounts must be created by an administrator before they can be assigned.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Assign a trainer to a candidate">
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!cand || !trainer) {
                toast.error("Choose a candidate and a trainer.");
                return;
              }
              const done = await run(
                () =>
                  supabase.rpc("admin_assign_trainer", {
                    _candidate: cand,
                    _trainer: trainer,
                    _team: (team === NONE ? null : team) as string,
                  }),
                "Trainer assigned",
              );
              if (done) setCand("");
            }}
          >
            <Picker
              id="cand"
              label="Candidate"
              value={cand}
              onChange={setCand}
              options={d.candidates.map((c) => [c.id, `${d.name(c.id)} · ${c.code}`])}
            />
            <Picker
              id="trainer"
              label="Trainer"
              value={trainer}
              onChange={setTrainer}
              options={d.trainers.map((t) => [t, d.name(t)])}
            />
            <Picker
              id="team"
              label="Team (optional)"
              value={team}
              onChange={setTeam}
              options={[
                [NONE, "No team"],
                ...d.teams.map((t) => [t.id, t.name] as [string, string]),
              ]}
            />
            <p className="text-xs text-muted-foreground">
              A candidate has one active assignment. Assigning again replaces the previous one; the
              change is recorded in the activity log.
            </p>
            <Button type="submit" disabled={busy}>
              Assign
            </Button>
          </form>
        </Section>

        <Section title="Teams">
          <form
            className="mb-4 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await run(
                  () => supabase.rpc("admin_create_team", { _name: teamName }),
                  "Team created",
                )
              )
                setTeamName("");
            }}
          >
            <Label htmlFor="team-name" className="sr-only">
              New team name
            </Label>
            <Input
              id="team-name"
              placeholder="New team name"
              value={teamName}
              maxLength={80}
              onChange={(e) => setTeamName(e.target.value)}
            />
            <Button type="submit" variant="outline" disabled={busy || teamName.trim().length < 2}>
              Create
            </Button>
          </form>
          {d.teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams yet.</p>
          ) : (
            <ul className="space-y-4">
              {d.teams.map((t) => {
                const mgrs = d.teamManagers.filter((m) => m.team_id === t.id);
                const avail = d.managers.filter((m) => !mgrs.some((x) => x.manager_id === m));
                return (
                  <li key={t.id} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.assignments.filter((a) => a.team_id === t.id).length} candidates
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {mgrs.length === 0 && (
                        <span className="text-xs text-muted-foreground">No manager</span>
                      )}
                      {mgrs.map((m) => (
                        <span
                          key={m.manager_id}
                          className="inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs"
                        >
                          {d.name(m.manager_id)}
                          <button
                            type="button"
                            aria-label={`Remove ${d.name(m.manager_id)}`}
                            disabled={busy}
                            onClick={() =>
                              run(
                                () =>
                                  supabase.rpc("admin_set_team_manager", {
                                    _team: t.id,
                                    _manager: m.manager_id,
                                    _assign: false,
                                  }),
                                "Manager removed",
                              )
                            }
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    {avail.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        <Picker
                          id={`mgr-${t.id}`}
                          label="Add manager"
                          hideLabel
                          value={mgrPick[t.id] ?? ""}
                          onChange={(v) => setMgrPick((s) => ({ ...s, [t.id]: v }))}
                          options={avail.map((m) => [m, d.name(m)])}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy || !mgrPick[t.id]}
                          onClick={() =>
                            run(
                              () =>
                                supabase.rpc("admin_set_team_manager", {
                                  _team: t.id,
                                  _manager: mgrPick[t.id]!,
                                  _assign: true,
                                }),
                              "Manager assigned",
                            )
                          }
                        >
                          Add
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>

      <div className="mt-6">
        <Section title={`Active assignments (${d.assignments.length})`}>
          {d.assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No candidates are assigned to a trainer yet.
            </p>
          ) : (
            <ul className="divide-y">
              {d.assignments.map((a) => (
                <li
                  key={a.candidate_id}
                  className="flex flex-col gap-2 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    <span className="font-medium">{d.name(a.candidate_id)}</span>{" "}
                    <span className="text-muted-foreground">
                      → {d.name(a.trainer_id)} · {teamName_(a.team_id)} · since{" "}
                      {fmtDate(a.assigned_at)}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setConfirmEnd(a.candidate_id)}
                  >
                    End assignment
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
      <ConfirmationDialog
        open={!!confirmEnd}
        onOpenChange={(o) => !o && setConfirmEnd(null)}
        title="End this assignment?"
        description="The trainer and team manager will no longer see this candidate. Coaching notes are kept."
        confirmLabel="End assignment"
        destructive
        onConfirm={() => {
          const id = confirmEnd!;
          setConfirmEnd(null);
          void run(
            () => supabase.rpc("admin_end_assignment", { _candidate: id }),
            "Assignment ended",
          );
        }}
      />
    </>
  );
}

function Picker({
  id,
  label,
  value,
  onChange,
  options,
  hideLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  hideLabel?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <Label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </Label>
      <Select {...(value ? { value } : {})} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue
            placeholder={options.length ? `Select ${label.toLowerCase()}` : "None available"}
          />
        </SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
