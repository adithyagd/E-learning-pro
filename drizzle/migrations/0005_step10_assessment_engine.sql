ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'assessment_resumed';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'assessment_timed_out';

CREATE TYPE public.question_type AS ENUM ('single_choice','multiple_choice','true_false','scenario','decision');
CREATE TYPE public.question_difficulty AS ENUM ('easy','medium','hard');
CREATE TYPE public.attempt_status AS ENUM ('in_progress','passed','failed','timed_out','abandoned');

-- Reusable configuration: one row per module assessment now; scope 'final' reserved for Step 11.
CREATE TABLE public.assessment_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'module' CHECK (scope IN ('module','final')),
  module_id uuid UNIQUE REFERENCES public.academy_modules(id),
  title text NOT NULL,
  question_count int NOT NULL DEFAULT 20 CHECK (question_count BETWEEN 1 AND 200),
  time_limit_seconds int NOT NULL DEFAULT 1200 CHECK (time_limit_seconds > 0),
  pass_mark int NOT NULL DEFAULT 70 CHECK (pass_mark BETWEEN 0 AND 100),
  easy_pct int NOT NULL DEFAULT 30,
  medium_pct int NOT NULL DEFAULT 50,
  hard_pct int NOT NULL DEFAULT 20,
  randomize_questions boolean NOT NULL DEFAULT true,
  randomize_options boolean NOT NULL DEFAULT true,
  allow_retries boolean NOT NULL DEFAULT true,
  max_attempts int CHECK (max_attempts IS NULL OR max_attempts > 0),
  status public.content_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (easy_pct >= 0 AND medium_pct >= 0 AND hard_pct >= 0 AND easy_pct + medium_pct + hard_pct = 100),
  CHECK ((scope = 'module') = (module_id IS NOT NULL))
);
GRANT SELECT, INSERT, UPDATE ON public.assessment_configs TO authenticated;
GRANT ALL ON public.assessment_configs TO service_role;
ALTER TABLE public.assessment_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read assessment configs" ON public.assessment_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert configs" ON public.assessment_configs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update configs" ON public.assessment_configs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER assessment_configs_updated BEFORE UPDATE ON public.assessment_configs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.assessment_configs (scope, module_id, title, pass_mark)
SELECT 'module', id, 'Module ' || module_number || ' Assessment', 70 FROM public.academy_modules
ON CONFLICT (module_id) DO NOTHING;

-- Question bank (answer key is admin-only).
CREATE TABLE public.assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  module_id uuid NOT NULL REFERENCES public.academy_modules(id),
  objective_index int NOT NULL CHECK (objective_index >= 1),
  question_type public.question_type NOT NULL,
  question_text text NOT NULL CHECK (length(btrim(question_text)) > 0),
  scenario_text text,
  difficulty public.question_difficulty NOT NULL,
  variant_group text NOT NULL,
  variant_number int NOT NULL DEFAULT 1 CHECK (variant_number >= 1),
  explanation text NOT NULL,
  status public.content_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (variant_group, variant_number)
);
CREATE INDEX assessment_questions_module_idx ON public.assessment_questions(module_id, status);
GRANT SELECT, INSERT, UPDATE ON public.assessment_questions TO authenticated;
GRANT ALL ON public.assessment_questions TO service_role;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read questions" ON public.assessment_questions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin insert questions" ON public.assessment_questions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update questions" ON public.assessment_questions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER assessment_questions_updated BEFORE UPDATE ON public.assessment_questions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.assessment_question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL CHECK (length(btrim(option_text)) > 0),
  is_correct boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, sort_order)
);
GRANT SELECT, INSERT, UPDATE ON public.assessment_question_options TO authenticated;
GRANT ALL ON public.assessment_question_options TO service_role;
ALTER TABLE public.assessment_question_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read options" ON public.assessment_question_options FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin insert options" ON public.assessment_question_options FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update options" ON public.assessment_question_options FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Attempts: written only by security-definer functions.
CREATE TABLE public.assessment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL REFERENCES public.assessment_configs(id),
  candidate_id uuid NOT NULL REFERENCES public.profiles(id),
  module_id uuid REFERENCES public.academy_modules(id),
  attempt_number int NOT NULL CHECK (attempt_number > 0),
  status public.attempt_status NOT NULL DEFAULT 'in_progress',
  question_count int NOT NULL CHECK (question_count > 0),
  time_limit_seconds int NOT NULL CHECK (time_limit_seconds > 0),
  pass_mark int NOT NULL CHECK (pass_mark BETWEEN 0 AND 100),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  submitted_at timestamptz,
  duration_seconds int CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  correct_count int CHECK (correct_count IS NULL OR correct_count BETWEEN 0 AND question_count),
  score_percent numeric(5,2) CHECK (score_percent IS NULL OR score_percent BETWEEN 0 AND 100),
  passed boolean,
  current_position int NOT NULL DEFAULT 1 CHECK (current_position >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, config_id, attempt_number),
  CHECK ((status = 'in_progress') = (submitted_at IS NULL))
);
CREATE UNIQUE INDEX assessment_attempts_one_active ON public.assessment_attempts(candidate_id, config_id) WHERE status = 'in_progress';
CREATE INDEX assessment_attempts_module_idx ON public.assessment_attempts(module_id, created_at DESC);
GRANT SELECT ON public.assessment_attempts TO authenticated;
GRANT ALL ON public.assessment_attempts TO service_role;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read permitted attempts" ON public.assessment_attempts FOR SELECT TO authenticated USING (public.can_view_candidate(auth.uid(), candidate_id));

CREATE TABLE public.assessment_attempt_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.assessment_questions(id),
  position int NOT NULL CHECK (position >= 1),
  question_type public.question_type NOT NULL,
  difficulty public.question_difficulty NOT NULL,
  objective_index int NOT NULL,
  variant_group text NOT NULL,
  variant_number int NOT NULL,
  question_text text NOT NULL,
  scenario_text text,
  explanation text NOT NULL,
  options jsonb NOT NULL,
  correct_option_ids uuid[] NOT NULL,
  selected_option_ids uuid[] NOT NULL DEFAULT '{}',
  answered_at timestamptz,
  is_correct boolean,
  UNIQUE (attempt_id, position),
  UNIQUE (attempt_id, question_id)
);
GRANT SELECT ON public.assessment_attempt_questions TO authenticated;
GRANT ALL ON public.assessment_attempt_questions TO service_role;
ALTER TABLE public.assessment_attempt_questions ENABLE ROW LEVEL SECURITY;
-- Rows hold the answer key, so they are readable only after the attempt is submitted.
CREATE POLICY "Read submitted attempt questions" ON public.assessment_attempt_questions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.assessment_attempts a WHERE a.id = attempt_id AND a.status <> 'in_progress' AND public.can_view_candidate(auth.uid(), a.candidate_id)));

CREATE OR REPLACE FUNCTION public.guard_attempt_change() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status <> 'in_progress' THEN RAISE EXCEPTION 'Submitted attempts cannot be changed'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER assessment_attempts_guard BEFORE UPDATE OR DELETE ON public.assessment_attempts FOR EACH ROW EXECUTE FUNCTION public.guard_attempt_change();
CREATE TRIGGER assessment_attempts_updated BEFORE UPDATE ON public.assessment_attempts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.guard_attempt_question_change() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF (SELECT status FROM assessment_attempts WHERE id = OLD.attempt_id) IS DISTINCT FROM 'in_progress' THEN
    RAISE EXCEPTION 'Submitted attempts cannot be changed';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER assessment_attempt_questions_guard BEFORE UPDATE OR DELETE ON public.assessment_attempt_questions FOR EACH ROW EXECUTE FUNCTION public.guard_attempt_question_change();

-- Internal: score and close an attempt. Not callable by clients.
CREATE OR REPLACE FUNCTION public.finalize_assessment_attempt(_attempt uuid, _timed_out boolean)
RETURNS public.assessment_attempts LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a public.assessment_attempts; v_correct int; v_pct numeric; v_pass boolean; v_status public.attempt_status; v_dur int;
BEGIN
  SELECT * INTO a FROM assessment_attempts WHERE id = _attempt FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attempt not found'; END IF;
  IF a.status <> 'in_progress' THEN RETURN a; END IF;

  UPDATE assessment_attempt_questions SET is_correct =
    (cardinality(selected_option_ids) > 0 AND selected_option_ids @> correct_option_ids AND correct_option_ids @> selected_option_ids)
  WHERE attempt_id = _attempt;
  SELECT count(*) FILTER (WHERE is_correct) INTO v_correct FROM assessment_attempt_questions WHERE attempt_id = _attempt;

  v_pct := round(v_correct * 100.0 / a.question_count, 2);
  v_pass := v_correct * 100 >= a.pass_mark * a.question_count; -- exact; never rounds a fail upward
  v_status := CASE WHEN _timed_out THEN 'timed_out' WHEN v_pass THEN 'passed' ELSE 'failed' END;
  v_dur := LEAST(a.time_limit_seconds, GREATEST(0, floor(extract(epoch FROM (now() - a.started_at)))::int));

  UPDATE assessment_attempts SET status = v_status, submitted_at = now(), duration_seconds = v_dur,
    correct_count = v_correct, score_percent = v_pct, passed = v_pass
  WHERE id = _attempt RETURNING * INTO a;

  INSERT INTO activity_logs (user_id, role, action, module_id, assessment_id, score, status, metadata)
  VALUES (a.candidate_id, 'candidate', (CASE WHEN _timed_out THEN 'assessment_timed_out' ELSE 'assessment_submitted' END)::activity_action,
          a.module_id, a.id, v_pct, v_status::text,
          jsonb_build_object('attempt_number', a.attempt_number, 'correct', v_correct, 'total', a.question_count, 'duration_seconds', v_dur));
  INSERT INTO activity_logs (user_id, role, action, module_id, assessment_id, score, status, metadata)
  VALUES (a.candidate_id, 'candidate', (CASE WHEN v_pass THEN 'assessment_passed' ELSE 'assessment_failed' END)::activity_action,
          a.module_id, a.id, v_pct, CASE WHEN v_pass THEN 'pass' ELSE 'fail' END,
          jsonb_build_object('attempt_number', a.attempt_number, 'correct', v_correct, 'total', a.question_count, 'pass_mark', a.pass_mark));

  IF v_pass AND a.module_id IS NOT NULL THEN
    INSERT INTO module_progress (candidate_id, module_id) VALUES (a.candidate_id, a.module_id) ON CONFLICT (candidate_id, module_id) DO NOTHING;
    UPDATE module_progress SET assessment_passed = true WHERE candidate_id = a.candidate_id AND module_id = a.module_id;
    PERFORM recalc_module_progress(a.candidate_id, a.module_id);
  END IF;
  RETURN a;
END; $$;

CREATE OR REPLACE FUNCTION public.start_module_assessment(_module uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid(); c public.assessment_configs; a public.assessment_attempts; mp public.module_progress;
  v_prev uuid[]; v_ids uuid[]; v_num int; v_e int; v_h int; v_m int; v_att uuid;
BEGIN
  IF v_uid IS NULL OR NOT has_role(v_uid,'candidate') THEN RAISE EXCEPTION 'Not permitted'; END IF;
  IF (SELECT account_status FROM profiles WHERE id = v_uid) <> 'active' THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT * INTO c FROM assessment_configs WHERE module_id = _module AND scope = 'module' AND status = 'active';
  IF NOT FOUND OR NOT is_module_unlocked(v_uid, _module) THEN RAISE EXCEPTION 'Assessment not available'; END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_uid::text || c.id::text));

  SELECT * INTO a FROM assessment_attempts WHERE candidate_id = v_uid AND config_id = c.id AND status = 'in_progress';
  IF FOUND THEN
    IF now() >= a.expires_at THEN
      PERFORM finalize_assessment_attempt(a.id, true);
    ELSE
      INSERT INTO activity_logs (user_id, role, action, module_id, assessment_id, metadata)
      VALUES (v_uid, 'candidate', 'assessment_resumed', _module, a.id, jsonb_build_object('attempt_number', a.attempt_number));
    END IF;
    RETURN a.id;
  END IF;

  SELECT * INTO mp FROM module_progress WHERE candidate_id = v_uid AND module_id = _module;
  IF NOT COALESCE(mp.lessons_completed, false) THEN RAISE EXCEPTION 'Complete all required lessons first'; END IF;
  IF COALESCE(mp.assessment_passed, false) THEN RAISE EXCEPTION 'Assessment already passed'; END IF;

  SELECT COALESCE(max(attempt_number), 0) + 1 INTO v_num FROM assessment_attempts WHERE candidate_id = v_uid AND config_id = c.id;
  IF v_num > 1 AND NOT c.allow_retries THEN RAISE EXCEPTION 'Retries are not allowed'; END IF;
  IF c.max_attempts IS NOT NULL AND v_num > c.max_attempts THEN RAISE EXCEPTION 'Attempt limit reached'; END IF;

  SELECT COALESCE(array_agg(aq.question_id), '{}') INTO v_prev FROM assessment_attempt_questions aq
   WHERE aq.attempt_id = (SELECT id FROM assessment_attempts WHERE candidate_id = v_uid AND config_id = c.id ORDER BY attempt_number DESC LIMIT 1);

  v_e := round(c.question_count * c.easy_pct / 100.0);
  v_h := round(c.question_count * c.hard_pct / 100.0);
  v_m := c.question_count - v_e - v_h;

  -- One question per variant group, filled to the difficulty quota, preferring questions not used in the previous attempt.
  SELECT ARRAY(
    SELECT id FROM (
      SELECT p.*, row_number() OVER (PARTITION BY p.difficulty, (p.vrank = 1) ORDER BY p.was_prev, p.rnd) AS drank
      FROM (
        SELECT q.id, q.difficulty, (q.id = ANY(v_prev)) AS was_prev, random() AS rnd,
               row_number() OVER (PARTITION BY q.variant_group ORDER BY (q.id = ANY(v_prev)), random()) AS vrank
        FROM assessment_questions q WHERE q.module_id = _module AND q.status = 'active'
      ) p
    ) r
    ORDER BY CASE WHEN r.vrank = 1 AND r.drank <= CASE r.difficulty WHEN 'easy' THEN v_e WHEN 'medium' THEN v_m ELSE v_h END THEN 0
                  WHEN r.vrank = 1 THEN 1 ELSE 2 END, r.was_prev, r.rnd
    LIMIT c.question_count
  ) INTO v_ids;
  IF cardinality(v_ids) = 0 THEN RAISE EXCEPTION 'Assessment not available'; END IF;

  INSERT INTO assessment_attempts (config_id, candidate_id, module_id, attempt_number, question_count, time_limit_seconds, pass_mark, started_at, expires_at)
  VALUES (c.id, v_uid, _module, v_num, cardinality(v_ids), c.time_limit_seconds, c.pass_mark, now(), now() + make_interval(secs => c.time_limit_seconds))
  RETURNING id INTO v_att;

  INSERT INTO assessment_attempt_questions (attempt_id, question_id, position, question_type, difficulty, objective_index, variant_group, variant_number,
    question_text, scenario_text, explanation, options, correct_option_ids)
  SELECT v_att, q.id, row_number() OVER (ORDER BY CASE WHEN c.randomize_questions THEN random() ELSE 0 END, q.code),
    q.question_type, q.difficulty, q.objective_index, q.variant_group, q.variant_number, q.question_text, q.scenario_text, q.explanation,
    (SELECT jsonb_agg(jsonb_build_object('id', o.id, 'text', o.option_text)
       ORDER BY CASE WHEN c.randomize_options AND q.question_type <> 'true_false' THEN random() ELSE o.sort_order::float8 END)
     FROM assessment_question_options o WHERE o.question_id = q.id),
    ARRAY(SELECT o.id FROM assessment_question_options o WHERE o.question_id = q.id AND o.is_correct)
  FROM assessment_questions q WHERE q.id = ANY(v_ids);

  INSERT INTO activity_logs (user_id, role, action, module_id, assessment_id, status, metadata)
  VALUES (v_uid, 'candidate', 'assessment_started', _module, v_att, 'in_progress', jsonb_build_object('attempt_number', v_num, 'question_count', cardinality(v_ids)));
  IF v_num > 1 THEN
    INSERT INTO activity_logs (user_id, role, action, module_id, assessment_id, metadata)
    VALUES (v_uid, 'candidate', 'assessment_retried', _module, v_att, jsonb_build_object('attempt_number', v_num));
  END IF;
  RETURN v_att;
END; $$;

-- Returns the attempt for the owner or permitted staff. Answer key only after submission.
CREATE OR REPLACE FUNCTION public.get_assessment_attempt(_attempt uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a public.assessment_attempts; v_done boolean; m record;
BEGIN
  SELECT * INTO a FROM assessment_attempts WHERE id = _attempt;
  IF NOT FOUND OR NOT can_view_candidate(auth.uid(), a.candidate_id) THEN RAISE EXCEPTION 'Not permitted'; END IF;
  IF a.status = 'in_progress' AND now() >= a.expires_at AND a.candidate_id = auth.uid() THEN
    a := finalize_assessment_attempt(a.id, true);
  END IF;
  v_done := a.status <> 'in_progress';
  SELECT module_number, title INTO m FROM academy_modules WHERE id = a.module_id;
  RETURN jsonb_build_object(
    'id', a.id, 'module_id', a.module_id, 'module_number', m.module_number, 'module_title', m.title,
    'attempt_number', a.attempt_number, 'status', a.status, 'question_count', a.question_count,
    'time_limit_seconds', a.time_limit_seconds, 'pass_mark', a.pass_mark, 'started_at', a.started_at,
    'expires_at', a.expires_at, 'submitted_at', a.submitted_at, 'duration_seconds', a.duration_seconds,
    'correct_count', a.correct_count, 'score_percent', a.score_percent, 'passed', a.passed,
    'current_position', a.current_position, 'server_now', now(),
    'questions', (SELECT COALESCE(jsonb_agg(
        jsonb_build_object('position', aq.position, 'question_type', aq.question_type, 'question_text', aq.question_text,
          'scenario_text', aq.scenario_text, 'options', aq.options, 'selected', to_jsonb(aq.selected_option_ids))
        || CASE WHEN v_done THEN jsonb_build_object('correct', to_jsonb(aq.correct_option_ids), 'is_correct', aq.is_correct, 'explanation', aq.explanation) ELSE '{}'::jsonb END
        ORDER BY aq.position), '[]'::jsonb)
      FROM assessment_attempt_questions aq WHERE aq.attempt_id = a.id));
END; $$;

CREATE OR REPLACE FUNCTION public.save_assessment_answer(_attempt uuid, _position int, _selected uuid[], _current int DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a public.assessment_attempts; aq public.assessment_attempt_questions; v_sel uuid[];
BEGIN
  SELECT * INTO a FROM assessment_attempts WHERE id = _attempt FOR UPDATE;
  IF NOT FOUND OR a.candidate_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  IF a.status <> 'in_progress' THEN RAISE EXCEPTION 'Attempt already submitted'; END IF;
  IF now() >= a.expires_at THEN
    PERFORM finalize_assessment_attempt(a.id, true);
    RETURN jsonb_build_object('timed_out', true);
  END IF;
  IF _selected IS NOT NULL THEN
    SELECT * INTO aq FROM assessment_attempt_questions WHERE attempt_id = _attempt AND position = _position;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid question'; END IF;
    v_sel := ARRAY(SELECT DISTINCT s FROM unnest(_selected) s WHERE s IS NOT NULL);
    IF EXISTS (SELECT 1 FROM unnest(v_sel) s WHERE NOT (aq.options @> jsonb_build_array(jsonb_build_object('id', s)))) THEN
      RAISE EXCEPTION 'Invalid answer';
    END IF;
    IF aq.question_type <> 'multiple_choice' AND cardinality(v_sel) > 1 THEN RAISE EXCEPTION 'Select one answer'; END IF;
    UPDATE assessment_attempt_questions SET selected_option_ids = v_sel, answered_at = now() WHERE id = aq.id;
  END IF;
  IF _current IS NOT NULL THEN
    UPDATE assessment_attempts SET current_position = LEAST(GREATEST(_current, 1), question_count) WHERE id = a.id;
  END IF;
  RETURN jsonb_build_object('timed_out', false);
END; $$;

CREATE OR REPLACE FUNCTION public.submit_assessment(_attempt uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a public.assessment_attempts;
BEGIN
  SELECT * INTO a FROM assessment_attempts WHERE id = _attempt FOR UPDATE;
  IF NOT FOUND OR a.candidate_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  IF a.status = 'in_progress' THEN
    a := finalize_assessment_attempt(a.id, now() > a.expires_at);
  END IF;
  RETURN jsonb_build_object('status', a.status, 'passed', a.passed, 'score_percent', a.score_percent);
END; $$;

REVOKE EXECUTE ON FUNCTION public.finalize_assessment_attempt(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_attempt_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_attempt_question_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.start_module_assessment(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_assessment_attempt(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_assessment_answer(uuid, int, uuid[], int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_assessment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_module_assessment(uuid), public.get_assessment_attempt(uuid),
  public.save_assessment_answer(uuid, int, uuid[], int), public.submit_assessment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_assessment_attempt(uuid, boolean) TO service_role;