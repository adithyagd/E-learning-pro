## Rules
- Academy progress is written only through `start_lesson` / `complete_lesson` RPCs (security definer); candidates have SELECT-only on progress tables. `recalc_module_progress` derives module %, status and candidate overall progress from real lesson completion.
- Module unlock is sequential via `is_module_unlocked()`; a module is completed only when required lessons are done AND (if `requires_assessment`) `module_progress.assessment_passed` is set server-side by the future assessment engine. Lessons of locked modules are hidden by RLS.
- Dashboards read module state through `academy_overview(candidate)`, which checks `can_view_candidate()` (self, admin, manager, assigned trainer).
- Recruiter module URLs use the module number (`/recruiter/module/1`); planned topic outlines live in `features/academy/outlines.ts` and are shown as "planned", never as content.
- Lesson content is stored as structured blocks in `lessons.content.blocks` (h, p, list, steps, terms, example, compare, callout) and rendered only by `features/academy/LessonContent.tsx` — keeps content data-driven and editable without code changes.
- Lessons may carry an optional `content.section` label; the module page groups consecutive lessons under it — keeps sections data-driven without a schema change.
