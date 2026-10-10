import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, CircleDot, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PerformanceBar } from "@/components/performance/PerformanceBadge";
import {
  MODULE_STATE_LABEL,
  moduleStatusDetail,
  type ModuleOverview,
  type ModuleState,
} from "./academy";

const stateCls: Record<ModuleState, string> = {
  locked: "border-border bg-muted text-muted-foreground",
  not_started: "border-info/30 bg-info/10 text-info",
  in_progress: "border-warning/40 bg-warning/15 text-warning-foreground",
  completed: "border-success/30 bg-success/10 text-success",
};
const stateIcon = {
  locked: Lock,
  not_started: Circle,
  in_progress: CircleDot,
  completed: CheckCircle2,
};

export function ModuleStateBadge({ state }: { state: ModuleState }) {
  const Icon = stateIcon[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-medium",
        stateCls[state],
      )}
    >
      <Icon className="size-3" aria-hidden /> {MODULE_STATE_LABEL[state]}
    </span>
  );
}

export function ModuleCard({ m }: { m: ModuleOverview }) {
  const locked = m.state === "locked";
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Module {m.module_number}
        </p>
        <ModuleStateBadge state={m.state} />
      </div>
      <h3 className="mt-2 text-base font-semibold leading-snug">{m.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{moduleStatusDetail(m)}</span>
          <span className="tabular-nums">{Math.round(Number(m.percentage))}%</span>
        </div>
        <PerformanceBar value={Number(m.percentage)} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Assessment:{" "}
        {m.requires_assessment
          ? m.assessment_passed
            ? "Passed"
            : locked
              ? "Locked"
              : m.lessons_completed
                ? "Ready"
                : "Locked until lessons are completed"
          : "Not required"}
      </p>
    </>
  );
  if (locked) {
    return (
      <article
        aria-label={`Module ${m.module_number}, locked`}
        className="rounded-md border bg-card p-5 opacity-80"
      >
        {body}
      </article>
    );
  }
  return (
    <Link
      to="/recruiter/module/$moduleId"
      params={{ moduleId: String(m.module_number) }}
      className="block rounded-md border bg-card p-5 transition-colors hover:border-primary focus-visible:border-primary"
    >
      {body}
    </Link>
  );
}
