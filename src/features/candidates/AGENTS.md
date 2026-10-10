## Rules
- Candidate management writes (create, edit, status, invite, viewed) go through admin-only server functions in `features/candidates/candidates.functions.ts` that verify `has_role(admin)` before using the privileged client and audit-log with actor + `target_user_id`.
- Candidate lists/detail read the `candidate_directory` view (security_invoker) so RLS on the underlying tables applies; pagination/filter/sort are server-side.
- `candidate_profiles.employee_id` is the Candidate ID (sign-in identifier); the optional HR Employee ID is `hr_employee_id`.
- Candidates are created by email invitation only (they set their own password); accepting the invite on /reset-password activates an INVITED account.
