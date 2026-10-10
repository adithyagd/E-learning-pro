ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'final_assessment_opened';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'final_assessment_started';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'final_assessment_submitted';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'final_assessment_failed';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'final_assessment_retried';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'final_assessment_timed_out';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'final_assessment_resumed';

-- Question bank scope: module questions vs the dedicated Final Assessment bank. module_id stays as topic association.
ALTER TABLE public.assessment_questions ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'module';
ALTER TABLE public.assessment_questions ADD CONSTRAINT assessment_questions_scope_chk CHECK (scope IN ('module','final'));
CREATE INDEX IF NOT EXISTS assessment_questions_scope_idx ON public.assessment_questions (scope, status, module_id);
CREATE UNIQUE INDEX IF NOT EXISTS assessment_configs_one_final ON public.assessment_configs ((scope)) WHERE scope = 'final';
CREATE INDEX IF NOT EXISTS assessment_attempts_candidate_config_idx ON public.assessment_attempts (candidate_id, config_id, attempt_number DESC);

INSERT INTO public.assessment_configs (scope, module_id, title, question_count, time_limit_seconds, pass_mark, easy_pct, medium_pct, hard_pct, randomize_questions, randomize_options, allow_retries, max_attempts, status)
SELECT 'final', NULL, 'Final Assessment', 20, 1200, 70, 25, 50, 25, true, true, true, NULL, 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.assessment_configs WHERE scope = 'final');

-- Eligibility: every active module completed AND its assessment passed (server-enforced).
CREATE OR REPLACE FUNCTION public.is_final_assessment_eligible(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM academy_modules WHERE status = 'active')
     AND NOT EXISTS (
       SELECT 1 FROM academy_modules m
       LEFT JOIN module_progress mp ON mp.module_id = m.id AND mp.candidate_id = _user
       WHERE m.status = 'active'
         AND NOT (COALESCE(mp.status = 'completed', false) AND COALESCE(mp.lessons_completed, false)
                  AND (NOT m.requires_assessment OR COALESCE(mp.assessment_passed, false))))
$$;

-- Module assessments must only draw from module-scoped questions.
CREATE OR REPLACE FUNCTION public.start_module_assessment(_module uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
    IF now() >= a.expires_at THEN PERFORM finalize_assessment_attempt(a.id, true);
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
  SELECT ARRAY(
    SELECT id FROM (
      SELECT p.*, row_number() OVER (PARTITION BY p.difficulty, (p.vrank = 1) ORDER BY p.was_prev, p.rnd) AS drank
      FROM (
        SELECT q.id, q.difficulty, (q.id = ANY(v_prev)) AS was_prev, random() AS rnd,
               row_number() OVER (PARTITION BY q.variant_group ORDER BY (q.id = ANY(v_prev)), random()) AS vrank
        FROM assessment_questions q WHERE q.module_id = _module AND q.scope = 'module' AND q.status = 'active'
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
END; $function$;

-- Final Assessment start: eligibility enforced server-side; 4 questions per module (1 easy, 2 medium, 1 hard),
-- one per variant group, preferring questions not used in the previous attempt.
CREATE OR REPLACE FUNCTION public.start_final_assessment()
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); c public.assessment_configs; a public.assessment_attempts;
  v_prev uuid[]; v_ids uuid[]; v_num int; v_att uuid; v_mods int; v_per int; v_e int; v_h int; v_m int; v_extra uuid[];
BEGIN
  IF v_uid IS NULL OR NOT has_role(v_uid,'candidate') THEN RAISE EXCEPTION 'Not permitted'; END IF;
  IF (SELECT account_status FROM profiles WHERE id = v_uid) <> 'active' THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT * INTO c FROM assessment_configs WHERE scope = 'final' AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Assessment not available'; END IF;
  IF NOT is_final_assessment_eligible(v_uid) THEN RAISE EXCEPTION 'Final Assessment locked'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_uid::text || c.id::text));

  SELECT * INTO a FROM assessment_attempts WHERE candidate_id = v_uid AND config_id = c.id AND status = 'in_progress';
  IF FOUND THEN
    IF now() >= a.expires_at THEN PERFORM finalize_assessment_attempt(a.id, true);
    ELSE
      INSERT INTO activity_logs (user_id, role, action, assessment_id, metadata)
      VALUES (v_uid, 'candidate', 'final_assessment_resumed', a.id, jsonb_build_object('attempt_number', a.attempt_number, 'attempt_id', a.id));
    END IF;
    RETURN a.id;
  END IF;

  SELECT COALESCE(max(attempt_number), 0) + 1 INTO v_num FROM assessment_attempts WHERE candidate_id = v_uid AND config_id = c.id;
  IF v_num > 1 AND NOT c.allow_retries THEN RAISE EXCEPTION 'Retries are not allowed'; END IF;
  IF c.max_attempts IS NOT NULL AND v_num > c.max_attempts THEN RAISE EXCEPTION 'Attempt limit reached'; END IF;

  SELECT COALESCE(array_agg(aq.question_id), '{}') INTO v_prev FROM assessment_attempt_questions aq
   WHERE aq.attempt_id = (SELECT id FROM assessment_attempts WHERE candidate_id = v_uid AND config_id = c.id ORDER BY attempt_number DESC LIMIT 1);

  SELECT count(DISTINCT module_id) INTO v_mods FROM assessment_questions WHERE scope = 'final' AND status = 'active';
  IF v_mods = 0 THEN RAISE EXCEPTION 'Assessment not available'; END IF;
  v_per := c.question_count / v_mods;
  v_e := round(v_per * c.easy_pct / 100.0); v_h := round(v_per * c.hard_pct / 100.0); v_m := v_per - v_e - v_h;

  SELECT ARRAY(
    SELECT id FROM (
      SELECT p.*, row_number() OVER (PARTITION BY p.module_id, p.difficulty ORDER BY p.was_prev, p.rnd) AS drank
      FROM (
        SELECT q.id, q.module_id, q.difficulty, (q.id = ANY(v_prev)) AS was_prev, random() AS rnd,
               row_number() OVER (PARTITION BY q.variant_group ORDER BY (q.id = ANY(v_prev)), random()) AS vrank
        FROM assessment_questions q WHERE q.scope = 'final' AND q.status = 'active'
      ) p WHERE p.vrank = 1
    ) r
    WHERE r.drank <= CASE r.difficulty WHEN 'easy' THEN v_e WHEN 'medium' THEN v_m ELSE v_h END
  ) INTO v_ids;

  -- Top up (uneven bank) with unused groups, still one per variant group.
  IF cardinality(v_ids) < c.question_count THEN
    SELECT ARRAY(
      SELECT p.id FROM (
        SELECT q.id, q.variant_group, (q.id = ANY(v_prev)) AS was_prev, random() AS rnd,
               row_number() OVER (PARTITION BY q.variant_group ORDER BY (q.id = ANY(v_prev)), random()) AS vrank
        FROM assessment_questions q WHERE q.scope = 'final' AND q.status = 'active'
          AND q.variant_group NOT IN (SELECT variant_group FROM assessment_questions WHERE id = ANY(v_ids))
      ) p WHERE p.vrank = 1 ORDER BY p.was_prev, p.rnd LIMIT c.question_count - cardinality(v_ids)
    ) INTO v_extra;
    v_ids := v_ids || v_extra;
  END IF;
  IF cardinality(v_ids) < c.question_count THEN RAISE EXCEPTION 'Assessment not available'; END IF;

  INSERT INTO assessment_attempts (config_id, candidate_id, module_id, attempt_number, question_count, time_limit_seconds, pass_mark, started_at, expires_at)
  VALUES (c.id, v_uid, NULL, v_num, cardinality(v_ids), c.time_limit_seconds, c.pass_mark, now(), now() + make_interval(secs => c.time_limit_seconds))
  RETURNING id INTO v_att;

  INSERT INTO assessment_attempt_questions (attempt_id, question_id, position, question_type, difficulty, objective_index, variant_group, variant_number,
    question_text, scenario_text, explanation, options, correct_option_ids)
  SELECT v_att, q.id, row_number() OVER (ORDER BY random()),
    q.question_type, q.difficulty, q.objective_index, q.variant_group, q.variant_number, q.question_text, q.scenario_text, q.explanation,
    (SELECT jsonb_agg(jsonb_build_object('id', o.id, 'text', o.option_text)
       ORDER BY CASE WHEN c.randomize_options AND q.question_type <> 'true_false' THEN random() ELSE o.sort_order::float8 END)
     FROM assessment_question_options o WHERE o.question_id = q.id),
    ARRAY(SELECT o.id FROM assessment_question_options o WHERE o.question_id = q.id AND o.is_correct)
  FROM assessment_questions q WHERE q.id = ANY(v_ids);

  INSERT INTO activity_logs (user_id, role, action, assessment_id, status, metadata)
  VALUES (v_uid, 'candidate', 'final_assessment_started', v_att, 'in_progress',
          jsonb_build_object('attempt_number', v_num, 'attempt_id', v_att, 'question_count', cardinality(v_ids), 'config_id', c.id));
  IF v_num > 1 THEN
    INSERT INTO activity_logs (user_id, role, action, assessment_id, metadata)
    VALUES (v_uid, 'candidate', 'final_assessment_retried', v_att, jsonb_build_object('attempt_number', v_num, 'attempt_id', v_att));
  END IF;
  RETURN v_att;
END; $function$;

-- Finalize: same scoring for both scopes; final attempts log final_* events and mark academy completion.
CREATE OR REPLACE FUNCTION public.finalize_assessment_attempt(_attempt uuid, _timed_out boolean)
 RETURNS assessment_attempts LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE a public.assessment_attempts; v_correct int; v_pct numeric; v_pass boolean; v_status public.attempt_status; v_dur int; v_final boolean;
  v_meta jsonb;
BEGIN
  SELECT * INTO a FROM assessment_attempts WHERE id = _attempt FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attempt not found'; END IF;
  IF a.status <> 'in_progress' THEN RETURN a; END IF;
  SELECT scope = 'final' INTO v_final FROM assessment_configs WHERE id = a.config_id;

  UPDATE assessment_attempt_questions SET is_correct =
    (cardinality(selected_option_ids) > 0 AND selected_option_ids @> correct_option_ids AND correct_option_ids @> selected_option_ids)
  WHERE attempt_id = _attempt;
  SELECT count(*) FILTER (WHERE is_correct) INTO v_correct FROM assessment_attempt_questions WHERE attempt_id = _attempt;

  v_pct := round(v_correct * 100.0 / a.question_count, 2);
  v_pass := v_correct * 100 >= a.pass_mark * a.question_count;
  v_status := CASE WHEN _timed_out THEN 'timed_out' WHEN v_pass THEN 'passed' ELSE 'failed' END;
  v_dur := LEAST(a.time_limit_seconds, GREATEST(0, floor(extract(epoch FROM (now() - a.started_at)))::int));

  UPDATE assessment_attempts SET status = v_status, submitted_at = now(), duration_seconds = v_dur,
    correct_count = v_correct, score_percent = v_pct, passed = v_pass
  WHERE id = _attempt RETURNING * INTO a;

  v_meta := jsonb_build_object('attempt_number', a.attempt_number, 'attempt_id', a.id, 'correct', v_correct,
                               'total', a.question_count, 'duration_seconds', v_dur, 'pass_mark', a.pass_mark);
  IF v_final THEN
    INSERT INTO activity_logs (user_id, role, action, assessment_id, score, status, metadata)
    VALUES (a.candidate_id, 'candidate', (CASE WHEN _timed_out THEN 'final_assessment_timed_out' ELSE 'final_assessment_submitted' END)::activity_action,
            a.id, v_pct, v_status::text, v_meta);
    INSERT INTO activity_logs (user_id, role, action, assessment_id, score, status, metadata)
    VALUES (a.candidate_id, 'candidate', (CASE WHEN v_pass THEN 'final_assessment_passed' ELSE 'final_assessment_failed' END)::activity_action,
            a.id, v_pct, CASE WHEN v_pass THEN 'pass' ELSE 'fail' END, v_meta);
    IF v_pass THEN
      UPDATE candidate_profiles SET academy_status = 'completed', progress_percent = 100
      WHERE user_id = a.candidate_id AND academy_status <> 'certified';
    END IF;
    RETURN a;
  END IF;

  INSERT INTO activity_logs (user_id, role, action, module_id, assessment_id, score, status, metadata)
  VALUES (a.candidate_id, 'candidate', (CASE WHEN _timed_out THEN 'assessment_timed_out' ELSE 'assessment_submitted' END)::activity_action,
          a.module_id, a.id, v_pct, v_status::text, v_meta);
  INSERT INTO activity_logs (user_id, role, action, module_id, assessment_id, score, status, metadata)
  VALUES (a.candidate_id, 'candidate', (CASE WHEN v_pass THEN 'assessment_passed' ELSE 'assessment_failed' END)::activity_action,
          a.module_id, a.id, v_pct, CASE WHEN v_pass THEN 'pass' ELSE 'fail' END, v_meta);
  IF v_pass AND a.module_id IS NOT NULL THEN
    INSERT INTO module_progress (candidate_id, module_id) VALUES (a.candidate_id, a.module_id) ON CONFLICT (candidate_id, module_id) DO NOTHING;
    UPDATE module_progress SET assessment_passed = true WHERE candidate_id = a.candidate_id AND module_id = a.module_id;
    PERFORM recalc_module_progress(a.candidate_id, a.module_id);
  END IF;
  RETURN a;
END; $function$;

-- Overview for the Final Assessment page; logs "opened" for the candidate themself.
CREATE OR REPLACE FUNCTION public.final_assessment_overview(_candidate uuid, _log_open boolean DEFAULT false)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c public.assessment_configs; v_attempts jsonb; v_active uuid; v_passed boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT can_view_candidate(auth.uid(), _candidate) THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT * INTO c FROM assessment_configs WHERE scope = 'final' AND status = 'active';
  IF NOT FOUND THEN RETURN jsonb_build_object('available', false); END IF;
  -- Expired in-progress attempts are finalized when their owner views the page (server timer is authoritative).
  IF _candidate = auth.uid() THEN
    PERFORM finalize_assessment_attempt(id, true) FROM assessment_attempts
     WHERE candidate_id = _candidate AND config_id = c.id AND status = 'in_progress' AND now() >= expires_at;
    IF _log_open THEN
      INSERT INTO activity_logs (user_id, role, action, metadata)
      VALUES (auth.uid(), 'candidate', 'final_assessment_opened', jsonb_build_object('config_id', c.id));
    END IF;
  END IF;
  SELECT id INTO v_active FROM assessment_attempts WHERE candidate_id = _candidate AND config_id = c.id AND status = 'in_progress';
  SELECT COALESCE(bool_or(passed), false) INTO v_passed FROM assessment_attempts WHERE candidate_id = _candidate AND config_id = c.id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'attempt_number', attempt_number, 'status', status, 'score_percent', score_percent,
           'correct_count', correct_count, 'question_count', question_count, 'passed', passed, 'started_at', started_at,
           'submitted_at', submitted_at, 'duration_seconds', duration_seconds) ORDER BY attempt_number DESC), '[]'::jsonb)
    INTO v_attempts FROM assessment_attempts WHERE candidate_id = _candidate AND config_id = c.id;
  RETURN jsonb_build_object('available', true, 'config_id', c.id, 'title', c.title, 'question_count', c.question_count,
    'time_limit_seconds', c.time_limit_seconds, 'pass_mark', c.pass_mark,
    'eligible', is_final_assessment_eligible(_candidate), 'active_attempt_id', v_active, 'passed', v_passed,
    'certificate_status', CASE WHEN v_passed THEN 'pending_admin_approval' ELSE NULL END,
    'attempts', v_attempts);
END; $function$;

-- Attempt payload now carries its scope so the UI can tell final from module attempts.
CREATE OR REPLACE FUNCTION public.get_assessment_attempt(_attempt uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE a public.assessment_attempts; v_done boolean; m record; v_scope text;
BEGIN
  SELECT * INTO a FROM assessment_attempts WHERE id = _attempt;
  IF NOT FOUND OR NOT can_view_candidate(auth.uid(), a.candidate_id) THEN RAISE EXCEPTION 'Not permitted'; END IF;
  IF a.status = 'in_progress' AND now() >= a.expires_at AND a.candidate_id = auth.uid() THEN
    a := finalize_assessment_attempt(a.id, true);
  END IF;
  v_done := a.status <> 'in_progress';
  SELECT scope INTO v_scope FROM assessment_configs WHERE id = a.config_id;
  SELECT module_number, title INTO m FROM academy_modules WHERE id = a.module_id;
  RETURN jsonb_build_object(
    'id', a.id, 'scope', v_scope, 'module_id', a.module_id, 'module_number', m.module_number, 'module_title', m.title,
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
END; $function$;

REVOKE EXECUTE ON FUNCTION public.is_final_assessment_eligible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_final_assessment_eligible(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.start_final_assessment() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_final_assessment() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.final_assessment_overview(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.final_assessment_overview(uuid, boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_assessment_attempt(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_assessment_attempt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_assessment_attempt(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.start_module_assessment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_module_assessment(uuid) TO authenticated;