import { cn } from "@/lib/utils";
import {
  getAssessmentResult,
  getPerformanceMeta,
  normalizePercent,
  type PerformanceLevel,
  type PerformanceOptions,
} from "@/lib/performance";

const dot: Record<PerformanceLevel, string> = {
  critical: "bg-perf-critical",
  low: "bg-perf-low",
  medium: "bg-perf-medium",
  good: "bg-perf-good",
  great: "bg-perf-great",
  outstanding: "bg-perf-outstanding",
};
const text: Record<PerformanceLevel, string> = {
  critical: "text-perf-critical",
  low: "text-perf-low",
  medium: "text-foreground",
  good: "text-perf-good",
  great: "text-perf-great",
  outstanding: "text-perf-outstanding",
};

interface Props extends PerformanceOptions {
  value: number;
  showValue?: boolean;
  className?: string;
}

export function PerformanceBadge({ value, showValue = true, className, ...opts }: Props) {
  const meta = getPerformanceMeta(value, opts);
  const v = normalizePercent(value, opts);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border bg-card px-2 py-0.5 text-xs font-medium",
        className,
      )}
      aria-label={`${Math.round(v)}% — ${meta.label} performance`}
    >
      <span className={cn("size-2 rounded-full", dot[meta.level])} aria-hidden />
      {showValue && <span className="tabular-nums text-foreground">{Math.round(v)}%</span>}
      <span className={text[meta.level]}>{meta.label}</span>
    </span>
  );
}

export function PerformanceBar({ value, className, ...opts }: Omit<Props, "showValue">) {
  const meta = getPerformanceMeta(value, opts);
  const v = normalizePercent(value, opts);
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={opts.allowOver100 ? undefined : 100}
      aria-label={`${meta.label} performance`}
    >
      <div className={cn("h-full", dot[meta.level])} style={{ width: `${Math.min(100, v)}%` }} />
    </div>
  );
}

export function AssessmentResultBadge({ score, passMark }: { score: number; passMark: number }) {
  const result = getAssessmentResult(score, passMark);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
        result === "pass"
          ? "bg-success text-success-foreground"
          : "bg-destructive text-destructive-foreground",
      )}
    >
      {result}
    </span>
  );
}
