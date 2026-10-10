ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'lesson_opened';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'module_started';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'module_completed';

CREATE TYPE public.content_status AS ENUM ('active','inactive');
CREATE TYPE public.lesson_content_type AS ENUM ('text','video','document','scenario','practice','quiz');
CREATE TYPE public.module_progress_status AS ENUM ('not_started','in_progress','completed');

ALTER TABLE public.activity_logs ADD COLUMN lesson_id uuid;

CREATE TABLE public.academy_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_number int NOT NULL UNIQUE CHECK (module_number > 0),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  learning_objectives text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL,
  status public.content_status NOT NULL DEFAULT 'active',
  requires_assessment boolean NOT NULL DEFAULT true,
  pass_mark int NOT NULL DEFAULT 70 CHECK (pass_mark BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_modules TO authenticated;
GRANT ALL ON public.academy_modules TO service_role;
ALTER TABLE public.academy_modules ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER academy_modules_updated BEFORE UPDATE ON public.academy_modules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_type public.lesson_content_type NOT NULL DEFAULT 'text',
  sort_order int NOT NULL,
  estimated_minutes int CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
  is_required boolean NOT NULL DEFAULT true,
  status public.content_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, sort_order)
);
CREATE INDEX lessons_module_idx ON public.lessons (module_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER lessons_updated BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.module_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  status public.module_progress_status NOT NULL DEFAULT 'not_started',
  percentage numeric NOT NULL DEFAULT 0 CHECK (percentage BETWEEN 0 AND 100),
  completed_lessons int NOT NULL DEFAULT 0,
  total_lessons int NOT NULL DEFAULT 0,
  lessons_completed boolean NOT NULL DEFAULT false,
  assessment_passed boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  completed_at timestamptz,
  last_activity_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, module_id)
);
GRANT SELECT ON public.module_progress TO authenticated;
GRANT ALL ON public.module_progress TO service_role;
ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER module_progress_updated BEFORE UPDATE ON public.module_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  started boolean NOT NULL DEFAULT true,
  completed boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  time_spent_seconds int NOT NULL DEFAULT 0 CHECK (time_spent_seconds >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, lesson_id)
);
CREATE INDEX lesson_progress_candidate_idx ON public.lesson_progress (candidate_id, module_id);
GRANT SELECT ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER lesson_progress_updated BEFORE UPDATE ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Can the caller see this candidate's learning data?
CREATE OR REPLACE FUNCTION public.can_view_candidate(_viewer uuid, _candidate uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _viewer = _candidate
    OR public.has_role(_viewer,'admin') OR public.has_role(_viewer,'manager')
    OR EXISTS (SELECT 1 FROM public.candidate_profiles WHERE user_id = _candidate AND assigned_trainer_id = _viewer)
$$;

-- Sequential unlock: module 1 (lowest active) open; next opens when the previous is completed.
CREATE OR REPLACE FUNCTION public.is_module_unlocked(_user uuid, _module uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH m AS (SELECT id, module_number FROM public.academy_modules WHERE id = _module AND status = 'active'),
       prev AS (
         SELECT am.id FROM public.academy_modules am, m
         WHERE am.status = 'active' AND am.module_number < m.module_number
       )
  SELECT EXISTS (SELECT 1 FROM m) AND NOT EXISTS (
    SELECT 1 FROM prev p
    WHERE NOT EXISTS (SELECT 1 FROM public.module_progress mp WHERE mp.module_id = p.id AND mp.candidate_id = _user AND mp.status = 'completed')
  )
$$;

CREATE POLICY "Read active modules" ON public.academy_modules FOR SELECT TO authenticated
  USING (status = 'active' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage modules ins" ON public.academy_modules FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage modules upd" ON public.academy_modules FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage modules del" ON public.academy_modules FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Read lessons" ON public.lessons FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'trainer')
  OR (status = 'active' AND public.has_role(auth.uid(),'candidate') AND public.is_module_unlocked(auth.uid(), module_id))
);
CREATE POLICY "Admin manage lessons ins" ON public.lessons FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage lessons upd" ON public.lessons FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage lessons del" ON public.lessons FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Read permitted module progress" ON public.module_progress FOR SELECT TO authenticated USING (public.can_view_candidate(auth.uid(), candidate_id));
CREATE POLICY "Read permitted lesson progress" ON public.lesson_progress FOR SELECT TO authenticated USING (public.can_view_candidate(auth.uid(), candidate_id));

-- Recompute a candidate's module progress + overall candidate progress from real lesson completion.
CREATE OR REPLACE FUNCTION public.recalc_module_progress(_user uuid, _module uuid)
RETURNS public.module_progress LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total int; v_done int; v_req_total int; v_req_done int; v_requires boolean; v_row public.module_progress;
  v_prev_status public.module_progress_status; v_status public.module_progress_status; v_pct numeric;
  v_overall numeric; v_all_completed boolean; v_any_started boolean;
BEGIN
  SELECT requires_assessment INTO v_requires FROM academy_modules WHERE id = _module;
  SELECT count(*), count(*) FILTER (WHERE is_required) INTO v_total, v_req_total FROM lessons WHERE module_id = _module AND status = 'active';
  SELECT count(*), count(*) FILTER (WHERE l.is_required) INTO v_done, v_req_done
    FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
    WHERE lp.candidate_id = _user AND l.module_id = _module AND l.status = 'active' AND lp.completed;
  v_pct := CASE WHEN v_total = 0 THEN 0 ELSE LEAST(100, round(v_done * 100.0 / v_total, 2)) END;

  INSERT INTO module_progress (candidate_id, module_id) VALUES (_user, _module) ON CONFLICT (candidate_id, module_id) DO NOTHING;
  SELECT status INTO v_prev_status FROM module_progress WHERE candidate_id = _user AND module_id = _module;

  UPDATE module_progress SET
    total_lessons = v_total, completed_lessons = v_done, percentage = v_pct,
    lessons_completed = (v_req_total > 0 AND v_req_done >= v_req_total),
    last_activity_at = now(),
    started_at = COALESCE(started_at, CASE WHEN EXISTS (SELECT 1 FROM lesson_progress WHERE candidate_id = _user AND module_id = _module) THEN now() END)
  WHERE candidate_id = _user AND module_id = _module;

  -- Completion requires all required lessons AND (when configured) a passed module assessment (future step).
  SELECT * INTO v_row FROM module_progress WHERE candidate_id = _user AND module_id = _module;
  v_status := CASE
    WHEN v_row.lessons_completed AND (NOT v_requires OR v_row.assessment_passed) THEN 'completed'
    WHEN v_row.started_at IS NOT NULL THEN 'in_progress'
    ELSE 'not_started' END;
  UPDATE module_progress SET status = v_status,
    completed_at = CASE WHEN v_status = 'completed' THEN COALESCE(completed_at, now()) ELSE NULL END
  WHERE id = v_row.id RETURNING * INTO v_row;

  IF v_prev_status IS DISTINCT FROM 'completed' AND v_status = 'completed' THEN
    INSERT INTO activity_logs (user_id, role, action, module_id) VALUES (_user, 'candidate', 'module_completed', _module);
  END IF;

  -- Overall candidate progress across active modules (capped at 100).
  SELECT COALESCE(LEAST(100, round(avg(COALESCE(mp.percentage, 0)), 2)), 0),
         bool_and(COALESCE(mp.status = 'completed', false)),
         bool_or(mp.started_at IS NOT NULL)
    INTO v_overall, v_all_completed, v_any_started
    FROM academy_modules am LEFT JOIN module_progress mp ON mp.module_id = am.id AND mp.candidate_id = _user
    WHERE am.status = 'active';
  UPDATE candidate_profiles SET progress_percent = v_overall,
    academy_status = CASE
      WHEN academy_status = 'certified' THEN 'certified'
      WHEN v_all_completed THEN 'completed'
      WHEN v_any_started THEN 'in_progress'
      ELSE academy_status END
  WHERE user_id = _user;
  RETURN v_row;
END; $$;

-- Candidate actions (the only write path for learning progress).
CREATE OR REPLACE FUNCTION public.start_lesson(_lesson uuid)
RETURNS public.lesson_progress LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_module uuid; v_row public.lesson_progress; v_new_module boolean;
BEGIN
  IF v_uid IS NULL OR NOT has_role(v_uid,'candidate') THEN RAISE EXCEPTION 'Not permitted'; END IF;
  IF (SELECT account_status FROM profiles WHERE id = v_uid) <> 'active' THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT module_id INTO v_module FROM lessons WHERE id = _lesson AND status = 'active';
  IF v_module IS NULL OR NOT is_module_unlocked(v_uid, v_module) THEN RAISE EXCEPTION 'Lesson not available'; END IF;

  SELECT * INTO v_row FROM lesson_progress WHERE candidate_id = v_uid AND lesson_id = _lesson;
  IF FOUND THEN RETURN v_row; END IF;

  v_new_module := NOT EXISTS (SELECT 1 FROM lesson_progress WHERE candidate_id = v_uid AND module_id = v_module);
  INSERT INTO lesson_progress (candidate_id, lesson_id, module_id) VALUES (v_uid, _lesson, v_module) RETURNING * INTO v_row;
  IF v_new_module THEN
    INSERT INTO activity_logs (user_id, role, action, module_id) VALUES (v_uid, 'candidate', 'module_started', v_module);
  END IF;
  INSERT INTO activity_logs (user_id, role, action, module_id, lesson_id) VALUES (v_uid, 'candidate', 'lesson_started', v_module, _lesson);
  PERFORM recalc_module_progress(v_uid, v_module);
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.complete_lesson(_lesson uuid, _time_spent_seconds int DEFAULT 0)
RETURNS public.lesson_progress LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_module uuid; v_row public.lesson_progress;
BEGIN
  IF v_uid IS NULL OR NOT has_role(v_uid,'candidate') THEN RAISE EXCEPTION 'Not permitted'; END IF;
  IF (SELECT account_status FROM profiles WHERE id = v_uid) <> 'active' THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT module_id INTO v_module FROM lessons WHERE id = _lesson AND status = 'active';
  IF v_module IS NULL OR NOT is_module_unlocked(v_uid, v_module) THEN RAISE EXCEPTION 'Lesson not available'; END IF;
  SELECT * INTO v_row FROM lesson_progress WHERE candidate_id = v_uid AND lesson_id = _lesson;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lesson not started'; END IF;
  IF v_row.completed THEN RETURN v_row; END IF;

  UPDATE lesson_progress SET completed = true, completed_at = now(),
    time_spent_seconds = time_spent_seconds + LEAST(GREATEST(COALESCE(_time_spent_seconds,0),0), 14400)
  WHERE id = v_row.id RETURNING * INTO v_row;
  INSERT INTO activity_logs (user_id, role, action, module_id, lesson_id, metadata)
    VALUES (v_uid, 'candidate', 'lesson_completed', v_module, _lesson, jsonb_build_object('time_spent_seconds', v_row.time_spent_seconds));
  PERFORM recalc_module_progress(v_uid, v_module);
  RETURN v_row;
END; $$;

-- Read model for dashboards: module states for a candidate (self, admin, manager, assigned trainer).
CREATE OR REPLACE FUNCTION public.academy_overview(_candidate uuid)
RETURNS TABLE (
  module_id uuid, module_number int, title text, description text, learning_objectives text[],
  requires_assessment boolean, pass_mark int, total_lessons int, completed_lessons int, percentage numeric,
  state text, lessons_completed boolean, assessment_passed boolean, started_at timestamptz, completed_at timestamptz, last_activity_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT can_view_candidate(auth.uid(), _candidate) THEN RAISE EXCEPTION 'Not permitted'; END IF;
  RETURN QUERY
  SELECT am.id, am.module_number, am.title, am.description, am.learning_objectives, am.requires_assessment, am.pass_mark,
    (SELECT count(*)::int FROM lessons l WHERE l.module_id = am.id AND l.status = 'active'),
    COALESCE(mp.completed_lessons, 0), COALESCE(mp.percentage, 0),
    CASE WHEN NOT is_module_unlocked(_candidate, am.id) THEN 'locked' ELSE COALESCE(mp.status::text, 'not_started') END,
    COALESCE(mp.lessons_completed, false), COALESCE(mp.assessment_passed, false), mp.started_at, mp.completed_at, mp.last_activity_at
  FROM academy_modules am
  LEFT JOIN module_progress mp ON mp.module_id = am.id AND mp.candidate_id = _candidate
  WHERE am.status = 'active'
  ORDER BY am.sort_order;
END; $$;

REVOKE EXECUTE ON FUNCTION public.recalc_module_progress(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.start_lesson(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_lesson(uuid, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.academy_overview(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_candidate(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_module_unlocked(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_lesson(uuid), public.complete_lesson(uuid, int), public.academy_overview(uuid),
  public.can_view_candidate(uuid, uuid), public.is_module_unlocked(uuid, uuid) TO authenticated;

-- Self-reported events: add lesson_opened.
DROP POLICY "Insert own activity" ON public.activity_logs;
CREATE POLICY "Insert own activity" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND action::text IN ('login','logout','module_opened','lesson_opened','learning_time','password_changed','access_denied'));

-- Academy structure (definitions only; lesson content is added in later steps).
INSERT INTO public.academy_modules (module_number, title, description, sort_order, learning_objectives) VALUES
(1, 'Recruitment Fundamentals', 'Core concepts of recruitment, the recruiter role and the end-to-end hiring lifecycle.', 1, '{}'),
(2, 'JD Decoding & Requirement Understanding', 'Reading job descriptions, clarifying requirements and building a candidate profile.', 2, '{}'),
(3, 'Candidate Sourcing & Recruitment Preparation', 'Sourcing channels, search techniques and preparing to approach candidates.', 3, '{}'),
(4, 'Communication, Screening & Interview Management', 'Candidate communication, screening calls and coordinating interviews.', 4, '{}'),
(5, 'Recruitment Operations', 'Candidate management, the recruitment pipeline and day-to-day recruitment operations.', 5, '{}');