/**
 * Global performance colour system.
 * Performance level is independent from assessment PASS/FAIL.
 */
export type PerformanceLevel = "critical" | "low" | "medium" | "good" | "great" | "outstanding";

export interface PerformanceMeta {
  level: PerformanceLevel;
  label: string;
  /** Tailwind token suffix, e.g. "perf-good" -> bg-perf-good */
  token: `perf-${PerformanceLevel}`;
}

const META: Record<PerformanceLevel, PerformanceMeta> = {
  critical: { level: "critical", label: "Critical", token: "perf-critical" },
  low: { level: "low", label: "Low", token: "perf-low" },
  medium: { level: "medium", label: "Medium", token: "perf-medium" },
  good: { level: "good", label: "Good", token: "perf-good" },
  great: { level: "great", label: "Great", token: "perf-great" },
  outstanding: { level: "outstanding", label: "Outstanding", token: "perf-outstanding" },
};

export interface PerformanceOptions {
  /** Allow values above 100% (KPI target achievement only). Default false. */
  allowOver100?: boolean;
}

/** Clamp a percentage. Normal scores are capped at 100. */
export function normalizePercent(value: number, opts: PerformanceOptions = {}): number {
  if (!Number.isFinite(value)) return 0;
  const v = Math.max(0, value);
  return opts.allowOver100 ? v : Math.min(100, v);
}

/**
 * 0–25 Critical · 26–50 Low · 51–75 Medium · 76–90 Good · 91–100 Great · >100 Outstanding
 */
export function getPerformanceLevel(
  value: number,
  opts: PerformanceOptions = {},
): PerformanceLevel {
  const v = normalizePercent(value, opts);
  if (v > 100) return "outstanding";
  if (v > 90) return "great";
  if (v > 75) return "good";
  if (v > 50) return "medium";
  if (v > 25) return "low";
  return "critical";
}

export function getPerformanceMeta(value: number, opts: PerformanceOptions = {}): PerformanceMeta {
  return META[getPerformanceLevel(value, opts)];
}

export const PERFORMANCE_LEVELS = Object.values(META);

/** Assessment result is a separate concept from performance colour. */
export type AssessmentResult = "pass" | "fail";
export function getAssessmentResult(score: number, passMark: number): AssessmentResult {
  return normalizePercent(score) >= passMark ? "pass" : "fail";
}
