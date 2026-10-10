ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'candidate_created';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'candidate_updated';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'candidate_activated';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'candidate_suspended';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'candidate_disabled';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'candidate_reenabled';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'candidate_invited';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'candidate_viewed';

ALTER TABLE public.activity_logs ADD COLUMN target_user_id uuid;
CREATE INDEX activity_logs_target_idx ON public.activity_logs (target_user_id, created_at DESC);
CREATE INDEX activity_logs_created_idx ON public.activity_logs (created_at DESC);

ALTER TABLE public.profiles ADD COLUMN last_login_at timestamptz;

COMMENT ON COLUMN public.candidate_profiles.employee_id IS 'Candidate ID (unique, used as sign-in identifier)';
ALTER TABLE public.candidate_profiles ADD COLUMN hr_employee_id text UNIQUE;
ALTER TABLE public.candidate_profiles ADD COLUMN department text;
ALTER TABLE public.candidate_profiles ADD COLUMN designation text;
ALTER TABLE public.candidate_profiles ADD COLUMN progress_percent numeric NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100);

CREATE UNIQUE INDEX profiles_email_lower_uidx ON public.profiles (lower(email));
CREATE INDEX candidate_profiles_created_idx ON public.candidate_profiles (created_at DESC);
CREATE INDEX candidate_profiles_status_idx ON public.candidate_profiles (academy_status);
CREATE INDEX profiles_account_status_idx ON public.profiles (account_status);

-- RLS-respecting directory view (security_invoker => caller's policies apply)
CREATE VIEW public.candidate_directory WITH (security_invoker = true) AS
SELECT cp.user_id, cp.employee_id AS candidate_id, cp.hr_employee_id, cp.department, cp.designation,
       cp.location, cp.joining_date, cp.academy_status, cp.progress_percent, cp.assigned_trainer_id,
       cp.created_at, cp.updated_at,
       p.full_name, p.email, p.phone, p.account_status, p.last_login_at
FROM public.candidate_profiles cp
JOIN public.profiles p ON p.id = cp.user_id;
GRANT SELECT ON public.candidate_directory TO authenticated;
GRANT SELECT ON public.candidate_directory TO service_role;