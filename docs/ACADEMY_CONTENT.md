# Academy content persistence

Lesson content lives in the database (`lessons.content.blocks`, `academy_modules.learning_objectives`), not in migrations.

- **Module 1**: inserted directly into the database in Step 5 (no seed file yet).
- **Modules 2–5**: source of truth is `supabase/seed/moduleN_content.py` (N = 2–5). Each generates the idempotent SQL `supabase/seed/moduleN_lessons.sql` (upserts on `module_id, sort_order`; never touches progress rows). Module 5 lessons also store their section (A/B/C) in `content.section`.

To restore Module 2 on a fresh database, run `module2_lessons.sql` with a privileged connection after migrations. Edit content in the Python file, regenerate, re-run.
