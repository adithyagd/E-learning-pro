import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Circle, CircleDot, Clock, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/layouts/AppShell";
import { EmptyState, ErrorState, LoadingState, NotFoundState } from "@/components/states";
import { PerformanceBar } from "@/components/performance/PerformanceBadge";
import { ModuleStateBadge } from "@/features/academy/components";
import {
  CONTENT_TYPE_LABEL,
  lessonProgressQuery,
  lessonsQuery,
  moduleStatusDetail,
  overviewQuery,
  type Lesson,
} from "@/features/academy/academy";
import { LessonContent } from "@/features/academy/LessonContent";
import { MODULE_OUTLINES } from "@/features/academy/outlines";
import { logActivity } from "@/features/auth/session";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/recruiter/module/$moduleId")({
  head: () => ({
    meta: [
      { title: "Module — E2E Recruiter Academy" },
      { name: "description", content: "Lessons and progress for this academy module." },
      { property: "og:title", content: "Module — E2E Recruiter Academy" },
      { property: "og:description", content: "Lessons and progress for this academy module." },
    ],
  }),
  component: ModuleDetail,
});

function ModuleDetail() {
  const { moduleId } = Route.useParams();
  const { session } = Route.useRouteContext();
  const qc = useQueryClient();
  const overview = useQuery(overviewQuery(session.userId));
  const mod = overview.data?.find((m) => String(m.module_number) === moduleId);
  const unlocked = !!mod && mod.state !== "locked";
  const lessons = useQuery({ ...lessonsQuery(mod?.module_id ?? ""), enabled: unlocked });
  const progress = useQuery({
    ...lessonProgressQuery(session.userId, mod?.module_id ?? ""),
    enabled: unlocked,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const openedAt = useRef<number>(Date.now());
  const loggedModule = useRef(false);

  useEffect(() => {
    if (mod && unlocked && !loggedModule.current) {
      loggedModule.current = true;
      void logActivity("module_opened", { module_id: mod.module_id, role: "candidate" }).catch(
        () => {},
      );
    }
  }, [mod, unlocked]);

  const list = lessons.data ?? [];
  const pmap = progress.data ?? new Map();
  const nextLesson = useMemo(
    () => list.find((l) => !pmap.get(l.id)?.completed) ?? null,
    [list, pmap],
  );
  const selected = list.find((l) => l.id === selectedId) ?? null;

  function openLesson(l: Lesson) {
    setSelectedId(l.id);
    openedAt.current = Date.now();
    void logActivity("lesson_opened", {
      module_id: l.module_id,
      role: "candidate",
      lesson_id: l.id,
    }).catch(() => {});
  }

  const refresh = () => qc.invalidateQueries({ queryKey: ["academy"] });

  async function start(l: Lesson) {
    setBusy(true);
    const { error } = await supabase.rpc("start_lesson", { _lesson: l.id });
    setBusy(false);
    if (error) {
      toast.error("This lesson could not be started.");
      return;
    }
    openedAt.current = Date.now();
    await refresh();
  }
  async function complete(l: Lesson) {
    setBusy(true);
    const seconds = Math.round((Date.now() - openedAt.current) / 1000);
    const { error } = await supabase.rpc("complete_lesson", {
      _lesson: l.id,
      _time_spent_seconds: seconds,
    });
    setBusy(false);
    if (error) {
      toast.error("This lesson could not be marked complete.");
      return;
    }
    toast.success("Lesson completed");
    await refresh();
  }

  if (overview.isPending) return <LoadingState label="Loading module…" />;
  if (overview.isError)
    return (
      <ErrorState
        description="This module could not be loaded."
        onRetry={() => overview.refetch()}
      />
    );
  if (!mod) return <NotFoundState />;

  const back = (
    <Link
      to="/recruiter/modules"
      className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden /> Back to modules
    </Link>
  );

  if (!unlocked) {
    return (
      <>
        {back}
        <PageHeader
          title={`Module ${mod.module_number} — ${mod.title}`}
          description={mod.description}
        />
        <div className="rounded-md border bg-card p-8 text-center">
          <Lock className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-3 text-base font-semibold">This module is locked</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete Module {mod.module_number - 1} and pass its assessment to unlock it.
          </p>
        </div>
      </>
    );
  }

  const outline = MODULE_OUTLINES[mod.module_number];
  const selProgress = selected ? pmap.get(selected.id) : undefined;
  const selIndex = selected ? list.findIndex((l) => l.id === selected.id) + 1 : 0;
  const assessmentState = mod.assessment_passed
    ? "Passed"
    : mod.lessons_completed
      ? "Ready"
      : "Locked until required lessons are completed";
  const fmtTime = (s: number) =>
    s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`;

  return (
    <>
      {back}
      <PageHeader
        title={`Module ${mod.module_number} — ${mod.title}`}
        description={mod.description}
        actions={
          nextLesson && (
            <Button onClick={() => openLesson(nextLesson)}>
              {pmap.size ? "Continue" : "Start module"}
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Status
          </p>
          <div className="mt-2">
            <ModuleStateBadge state={mod.state} />
          </div>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Progress
          </p>
          <div className="mt-2 flex items-center gap-3">
            <PerformanceBar value={Number(mod.percentage)} />
            <span className="text-sm tabular-nums">{Math.round(Number(mod.percentage))}%</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{moduleStatusDetail(mod)}</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Module assessment
          </p>
          <p className="mt-2 text-sm font-medium">
            Module {mod.module_number} Assessment · {assessmentState}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pass mark {mod.pass_mark}%.{" "}
            {mod.lessons_completed
              ? mod.assessment_passed
                ? "Assessment passed."
                : "Assessment pending."
              : "Opens after all required lessons are completed."}
          </p>
          {mod.lessons_completed && (
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link to="/recruiter/assessment/$assessmentId" params={{ assessmentId: moduleId }}>
                {mod.assessment_passed ? "View results" : "Go to assessment"}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <section className="mb-6 rounded-md border bg-card p-5" aria-labelledby="obj-h">
        <h2 id="obj-h" className="text-base font-semibold">
          Learning objectives
        </h2>
        {mod.learning_objectives.length ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {mod.learning_objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Learning objectives will be published with the module content.
          </p>
        )}
        {outline && (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {outline.map((sec) => (
              <div key={sec.heading}>
                <p className="text-sm font-medium">
                  {sec.heading}{" "}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(planned)</span>
                </p>
                <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  {sec.topics.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <section aria-labelledby="lessons-h">
          <h2 id="lessons-h" className="mb-3 text-base font-semibold">
            Lessons
          </h2>
          {lessons.isPending || progress.isPending ? (
            <LoadingState />
          ) : lessons.isError ? (
            <ErrorState
              description="Lessons could not be loaded."
              onRetry={() => lessons.refetch()}
            />
          ) : list.length === 0 ? (
            <EmptyState
              title="Lessons coming soon"
              description="Lesson content for this module will be added in a later release."
            />
          ) : (
            <ol className="divide-y rounded-md border bg-card">
              {list.map((l, i) => {
                const p = pmap.get(l.id);
                const Icon = p?.completed ? CheckCircle2 : p ? CircleDot : Circle;
                const section = (l.content as { section?: string } | null)?.section;
                const prevSection = i
                  ? (list[i - 1]?.content as { section?: string } | null)?.section
                  : undefined;
                return (
                  <li key={l.id}>
                    {section && section !== prevSection && (
                      <p className="bg-muted/50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {section}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => openLesson(l)}
                      aria-current={selectedId === l.id}
                      className={cn(
                        "flex w-full items-start gap-3 p-3 text-left hover:bg-accent",
                        selectedId === l.id && "bg-accent",
                      )}
                    >
                      <Icon
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          p?.completed
                            ? "text-success"
                            : p
                              ? "text-warning"
                              : "text-muted-foreground",
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {i + 1}. {l.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {CONTENT_TYPE_LABEL[l.content_type]}
                          {l.estimated_minutes ? ` · ${l.estimated_minutes} min` : ""}
                          {l.is_required ? "" : " · Optional"}
                          {" · "}
                          {p?.completed ? "Completed" : p ? "In progress" : "Not started"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section aria-live="polite" className="rounded-md border bg-card p-5">
          {!selected ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Select a lesson to view it.
            </p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Lesson {selIndex} · {CONTENT_TYPE_LABEL[selected.content_type]}
              </p>
              <h2 className="mt-1 text-lg font-semibold">{selected.title}</h2>
              {selected.estimated_minutes && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" aria-hidden /> {selected.estimated_minutes} min
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Status:{" "}
                {selProgress?.completed ? "Completed" : selProgress ? "In progress" : "Not started"}
                {selProgress?.completed
                  ? ` · Time spent ${fmtTime(selProgress.time_spent_seconds)}`
                  : ""}
              </p>
              {selected.description && <p className="mt-3 text-sm">{selected.description}</p>}
              <div className="mt-4 border-t pt-4">
                {selProgress ? (
                  <LessonContent content={selected.content} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select “Start lesson” to begin. Your progress is recorded from this point.
                  </p>
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {!selProgress && (
                  <Button onClick={() => start(selected)} disabled={busy}>
                    {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Start lesson
                  </Button>
                )}
                {selProgress && !selProgress.completed && (
                  <Button onClick={() => complete(selected)} disabled={busy}>
                    {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Mark as
                    complete
                  </Button>
                )}
                {selProgress?.completed && (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
                    <CheckCircle2 className="size-4" aria-hidden /> Completed
                  </span>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
