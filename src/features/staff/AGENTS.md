## Rules
- Trainer/manager scope comes only from `trainee_assignments` (one active row per candidate, optional team) and `team_managers`; `can_view_candidate()` uses them, so every RLS policy follows assignments — `candidate_profiles.assigned_trainer_id` is a synced legacy mirror.
- Assignments, teams and coaching notes are written only through security-definer RPCs (`admin_*`, `add/update_coaching_note`) that validate and audit-log; tables are SELECT-only for clients.
- Staff dashboards read `staff_trainee_overview()`, which is scoped server-side and never returns coaching note content (managers see status only).
