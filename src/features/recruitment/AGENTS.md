## Rules
- Recruitment Operations records (job_requirements, recruitment_candidates + history/activity/interviews) are separate from training candidates; tables are SELECT-only via RLS (can_access_requirement / can_access_recruitment_candidate) and all writes go through security-definer RPCs — keeps training data isolated and server-enforced.
- Recruitment access: admin = all; assigned recruiter = their requirements/candidates (can edit); manager = requirements of managed teams (view only); trainers none — explicit grants only.
- Recruitment UI lives in features/recruitment/Workspace.tsx, mounted per area at /admin/recruitment/$section, /manager/recruitment/$section, /recruiter/operations/$section — one workspace, no duplication.
