CREATE TYPE public.account_status AS ENUM ('active','invited','suspended','disabled');
CREATE TYPE public.academy_status AS ENUM ('not_started','in_progress','completed','certified');

ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'login_failed';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'password_reset_requested';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'password_changed';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'access_denied';

ALTER TABLE public.profiles ADD COLUMN account_status public.account_status NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN phone text;
ALTER TABLE public.activity_logs ADD COLUMN role public.app_role;

ALTER TABLE public.candidate_profiles ADD COLUMN location text;
ALTER TABLE public.candidate_profiles ADD COLUMN joining_date date;
ALTER TABLE public.candidate_profiles ADD COLUMN academy_status public.academy_status NOT NULL DEFAULT 'not_started';

CREATE TABLE public.staff_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_title text,
  department text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_profiles TO authenticated;
GRANT ALL ON public.staff_profiles TO service_role;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read own or admin" ON public.staff_profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage staff insert" ON public.staff_profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage staff update" ON public.staff_profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage staff delete" ON public.staff_profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER staff_profiles_updated BEFORE UPDATE ON public.staff_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Users may update their own profile, but never their own status/email: only admins change those.
CREATE OR REPLACE FUNCTION public.guard_profile_update() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    IF NEW.account_status IS DISTINCT FROM OLD.account_status OR NEW.email IS DISTINCT FROM OLD.email OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Not permitted';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_guard BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

-- Activity inserts by users must carry only actions they can legitimately self-report.
DROP POLICY "Insert own activity" ON public.activity_logs;
CREATE POLICY "Insert own activity" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND action::text IN ('login','logout','module_opened','lesson_started','learning_time','password_changed','access_denied'));