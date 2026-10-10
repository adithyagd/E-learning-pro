ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'coaching_note_created';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'coaching_note_updated';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'trainer_assigned';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'trainer_unassigned';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'team_created';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'team_manager_assigned';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'team_manager_removed';

CREATE TYPE public.coaching_status AS ENUM ('open','in_progress','resolved');
CREATE TYPE public.assignment_status AS ENUM ('active','ended');

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (char_length(btrim(name)) BETWEEN 2 AND 80),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES public.profiles(id),
  assigned_by uuid REFERENCES public.profiles(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, manager_id)
);
GRANT SELECT ON public.team_managers TO authenticated;
GRANT ALL ON public.team_managers TO service_role;
ALTER TABLE public.team_managers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.trainee_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.profiles(id),
  trainer_id uuid NOT NULL REFERENCES public.profiles(id),
  team_id uuid REFERENCES public.teams(id),
  status public.assignment_status NOT NULL DEFAULT 'active',
  assigned_by uuid REFERENCES public.profiles(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  ended_by uuid REFERENCES public.profiles(id)
);
CREATE UNIQUE INDEX trainee_assignments_one_active ON public.trainee_assignments(candidate_id) WHERE status = 'active';
CREATE INDEX trainee_assignments_trainer ON public.trainee_assignments(trainer_id) WHERE status = 'active';
CREATE INDEX trainee_assignments_team ON public.trainee_assignments(team_id) WHERE status = 'active';
GRANT SELECT ON public.trainee_assignments TO authenticated;
GRANT ALL ON public.trainee_assignments TO service_role;
ALTER TABLE public.trainee_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.coaching_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.profiles(id),
  trainer_id uuid NOT NULL REFERENCES public.profiles(id),
  content text NOT NULL CHECK (char_length(content) BETWEEN 3 AND 4000),
  status public.coaching_status NOT NULL DEFAULT 'open',
  follow_up_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coaching_notes_candidate ON public.coaching_notes(candidate_id, created_at DESC);
GRANT SELECT ON public.coaching_notes TO authenticated;
GRANT ALL ON public.coaching_notes TO service_role;
ALTER TABLE public.coaching_notes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER coaching_notes_updated BEFORE UPDATE ON public.coaching_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill any legacy trainer links into the assignment model.
INSERT INTO public.trainee_assignments (candidate_id, trainer_id)
SELECT cp.user_id, cp.assigned_trainer_id FROM public.candidate_profiles cp
WHERE cp.assigned_trainer_id IS NOT NULL AND public.has_role(cp.assigned_trainer_id, 'trainer');

-- Scope helpers
CREATE OR REPLACE FUNCTION public.is_assigned_trainer(_trainer uuid, _candidate uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.trainee_assignments
    WHERE candidate_id = _candidate AND trainer_id = _trainer AND status = 'active')
$$;

CREATE OR REPLACE FUNCTION public.manages_candidate(_manager uuid, _candidate uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_manager, 'manager') AND EXISTS (
    SELECT 1 FROM public.trainee_assignments a
    JOIN public.team_managers tm ON tm.team_id = a.team_id
    WHERE a.candidate_id = _candidate AND a.status = 'active' AND tm.manager_id = _manager)
$$;

CREATE OR REPLACE FUNCTION public.can_view_candidate(_viewer uuid, _candidate uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _viewer = _candidate
    OR public.has_role(_viewer, 'admin')
    OR public.manages_candidate(_viewer, _candidate)
    OR (public.has_role(_viewer, 'trainer') AND public.is_assigned_trainer(_viewer, _candidate))
$$;

REVOKE EXECUTE ON FUNCTION public.is_assigned_trainer(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.manages_candidate(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_assigned_trainer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manages_candidate(uuid, uuid) TO authenticated;

-- Tighten existing read policies: managers/trainers see only their assigned scope.
DROP POLICY "Candidate own / trainer assigned / admin manager read" ON public.candidate_profiles;
CREATE POLICY "Read own or permitted candidates" ON public.candidate_profiles FOR SELECT TO authenticated
  USING (public.can_view_candidate(auth.uid(), user_id));

DROP POLICY "Read own or staff activity" ON public.activity_logs;
CREATE POLICY "Read own or permitted activity" ON public.activity_logs FOR SELECT TO authenticated
  USING (public.can_view_candidate(auth.uid(), user_id));

DROP POLICY "View own profile or staff" ON public.profiles;
CREATE POLICY "View own, permitted or staff profiles" ON public.profiles FOR SELECT TO authenticated
  USING (
    public.can_view_candidate(auth.uid(), id)
    OR ((public.has_role(auth.uid(), 'trainer') OR public.has_role(auth.uid(), 'manager'))
        AND (public.has_role(id, 'trainer') OR public.has_role(id, 'manager') OR public.has_role(id, 'admin')))
  );

CREATE POLICY "Read teams in scope" ON public.teams FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.team_managers tm WHERE tm.team_id = teams.id AND tm.manager_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.trainee_assignments a WHERE a.team_id = teams.id AND a.trainer_id = auth.uid() AND a.status = 'active'));

CREATE POLICY "Read own team management" ON public.team_managers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR manager_id = auth.uid());

CREATE POLICY "Read assignments in scope" ON public.trainee_assignments FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR (trainer_id = auth.uid() AND status = 'active')
  OR (status = 'active' AND public.manages_candidate(auth.uid(), candidate_id)));

CREATE POLICY "Assigned trainer or admin read notes" ON public.coaching_notes FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR (trainer_id = auth.uid() AND public.is_assigned_trainer(auth.uid(), candidate_id)));

-- Admin assignment RPCs
CREATE OR REPLACE FUNCTION public.admin_create_team(_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _n text := btrim(coalesce(_name, ''));
BEGIN
  PERFORM public._require_admin();
  IF char_length(_n) < 2 OR char_length(_n) > 80 THEN RAISE EXCEPTION 'Team name must be 2–80 characters.'; END IF;
  IF EXISTS (SELECT 1 FROM teams WHERE lower(name) = lower(_n)) THEN RAISE EXCEPTION 'A team with this name already exists.'; END IF;
  INSERT INTO teams (name, created_by) VALUES (_n, auth.uid()) RETURNING id INTO _id;
  INSERT INTO activity_logs (user_id, action, role, metadata)
    VALUES (auth.uid(), 'team_created', 'admin', jsonb_build_object('team_id', _id, 'name', _n));
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_team_manager(_team uuid, _manager uuid, _assign boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._require_admin();
  IF NOT EXISTS (SELECT 1 FROM teams WHERE id = _team) THEN RAISE EXCEPTION 'Team not found.'; END IF;
  IF NOT public.has_role(_manager, 'manager') THEN RAISE EXCEPTION 'Selected user is not a manager.'; END IF;
  IF _assign THEN
    IF EXISTS (SELECT 1 FROM team_managers WHERE team_id = _team AND manager_id = _manager) THEN
      RAISE EXCEPTION 'This manager is already assigned to the team.'; END IF;
    INSERT INTO team_managers (team_id, manager_id, assigned_by) VALUES (_team, _manager, auth.uid());
    INSERT INTO activity_logs (user_id, action, role, target_user_id, metadata)
      VALUES (auth.uid(), 'team_manager_assigned', 'admin', _manager, jsonb_build_object('team_id', _team));
  ELSE
    DELETE FROM team_managers WHERE team_id = _team AND manager_id = _manager;
    IF NOT FOUND THEN RAISE EXCEPTION 'This manager is not assigned to the team.'; END IF;
    INSERT INTO activity_logs (user_id, action, role, target_user_id, metadata)
      VALUES (auth.uid(), 'team_manager_removed', 'admin', _manager, jsonb_build_object('team_id', _team));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_assign_trainer(_candidate uuid, _trainer uuid, _team uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cur trainee_assignments;
BEGIN
  PERFORM public._require_admin();
  IF NOT EXISTS (SELECT 1 FROM candidate_profiles WHERE user_id = _candidate) OR NOT public.has_role(_candidate, 'candidate') THEN
    RAISE EXCEPTION 'Candidate not found.'; END IF;
  IF NOT public.has_role(_trainer, 'trainer') THEN RAISE EXCEPTION 'Selected user is not a trainer.'; END IF;
  IF _team IS NOT NULL AND NOT EXISTS (SELECT 1 FROM teams WHERE id = _team) THEN RAISE EXCEPTION 'Team not found.'; END IF;
  SELECT * INTO _cur FROM trainee_assignments WHERE candidate_id = _candidate AND status = 'active' FOR UPDATE;
  IF FOUND THEN
    IF _cur.trainer_id = _trainer AND _cur.team_id IS NOT DISTINCT FROM _team THEN
      RAISE EXCEPTION 'This candidate already has this assignment.'; END IF;
    UPDATE trainee_assignments SET status = 'ended', ended_at = now(), ended_by = auth.uid() WHERE id = _cur.id;
  END IF;
  INSERT INTO trainee_assignments (candidate_id, trainer_id, team_id, assigned_by)
    VALUES (_candidate, _trainer, _team, auth.uid());
  UPDATE candidate_profiles SET assigned_trainer_id = _trainer WHERE user_id = _candidate;
  INSERT INTO activity_logs (user_id, action, role, target_user_id, metadata)
    VALUES (auth.uid(), 'trainer_assigned', 'admin', _candidate,
      jsonb_build_object('trainer_id', _trainer, 'team_id', _team, 'previous_trainer_id', _cur.trainer_id));
END $$;

CREATE OR REPLACE FUNCTION public.admin_end_assignment(_candidate uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cur trainee_assignments;
BEGIN
  PERFORM public._require_admin();
  UPDATE trainee_assignments SET status = 'ended', ended_at = now(), ended_by = auth.uid()
    WHERE candidate_id = _candidate AND status = 'active' RETURNING * INTO _cur;
  IF NOT FOUND THEN RAISE EXCEPTION 'This candidate has no active assignment.'; END IF;
  UPDATE candidate_profiles SET assigned_trainer_id = NULL WHERE user_id = _candidate;
  INSERT INTO activity_logs (user_id, action, role, target_user_id, metadata)
    VALUES (auth.uid(), 'trainer_unassigned', 'admin', _candidate,
      jsonb_build_object('trainer_id', _cur.trainer_id, 'team_id', _cur.team_id));
END $$;

-- Coaching note RPCs (assigned trainer only)
CREATE OR REPLACE FUNCTION public.add_coaching_note(_candidate uuid, _content text, _status public.coaching_status, _follow_up date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _c text := btrim(coalesce(_content, ''));
BEGIN
  IF NOT (public.has_role(auth.uid(), 'trainer') AND public.is_assigned_trainer(auth.uid(), _candidate)) THEN
    RAISE EXCEPTION 'You can only add notes for trainees assigned to you.'; END IF;
  IF char_length(_c) < 3 OR char_length(_c) > 4000 THEN RAISE EXCEPTION 'Note must be 3–4000 characters.'; END IF;
  IF _follow_up IS NOT NULL AND _follow_up < current_date - 1 THEN RAISE EXCEPTION 'Follow-up date cannot be in the past.'; END IF;
  INSERT INTO coaching_notes (candidate_id, trainer_id, content, status, follow_up_date)
    VALUES (_candidate, auth.uid(), _c, coalesce(_status, 'open'), _follow_up) RETURNING id INTO _id;
  INSERT INTO activity_logs (user_id, action, role, target_user_id, metadata)
    VALUES (auth.uid(), 'coaching_note_created', 'trainer', _candidate,
      jsonb_build_object('note_id', _id, 'status', coalesce(_status, 'open'), 'follow_up_date', _follow_up));
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.update_coaching_note(_note uuid, _content text, _status public.coaching_status, _follow_up date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n coaching_notes; _c text := btrim(coalesce(_content, ''));
BEGIN
  SELECT * INTO _n FROM coaching_notes WHERE id = _note FOR UPDATE;
  IF NOT FOUND OR _n.trainer_id <> auth.uid() OR NOT public.is_assigned_trainer(auth.uid(), _n.candidate_id) THEN
    RAISE EXCEPTION 'You can only edit your own notes for trainees assigned to you.'; END IF;
  IF char_length(_c) < 3 OR char_length(_c) > 4000 THEN RAISE EXCEPTION 'Note must be 3–4000 characters.'; END IF;
  UPDATE coaching_notes SET content = _c, status = _status, follow_up_date = _follow_up WHERE id = _note;
  INSERT INTO activity_logs (user_id, action, role, target_user_id, metadata)
    VALUES (auth.uid(), 'coaching_note_updated', 'trainer', _n.candidate_id,
      jsonb_build_object('note_id', _note, 'from_status', _n.status, 'to_status', _status,
        'content_changed', _c <> _n.content, 'follow_up_date', _follow_up));
END $$;

-- Scoped overview for admin / trainer / manager dashboards. No coaching note content.
CREATE OR REPLACE FUNCTION public.staff_trainee_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _res jsonb;
BEGIN
  IF _me IS NULL OR NOT (public.has_role(_me,'admin') OR public.has_role(_me,'trainer') OR public.has_role(_me,'manager')) THEN
    RAISE EXCEPTION 'Not authorized.'; END IF;
  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.full_name), '[]'::jsonb) INTO _res FROM (
    SELECT cp.user_id, p.full_name, p.email, cp.employee_id AS candidate_code, p.account_status,
      cp.academy_status, cp.progress_percent, cp.department, cp.designation,
      a.team_id, tm.name AS team_name, a.trainer_id, tp.full_name AS trainer_name, a.assigned_at,
      (SELECT max(l.created_at) FROM activity_logs l WHERE l.user_id = cp.user_id) AS last_activity_at,
      (SELECT jsonb_agg(jsonb_build_object(
          'module_number', m.module_number, 'title', m.title, 'pass_mark', m.pass_mark,
          'status', coalesce(mp.status::text, 'not_started'), 'percentage', coalesce(mp.percentage, 0),
          'completed_lessons', coalesce(mp.completed_lessons, 0), 'total_lessons', coalesce(mp.total_lessons, 0),
          'assessment_passed', coalesce(mp.assessment_passed, false),
          'attempts', (SELECT count(*) FROM assessment_attempts x WHERE x.candidate_id = cp.user_id AND x.module_id = m.id AND x.status IN ('passed','failed','timed_out')),
          'best_score', (SELECT max(x.score_percent) FROM assessment_attempts x WHERE x.candidate_id = cp.user_id AND x.module_id = m.id AND x.status IN ('passed','failed','timed_out')),
          'last_passed', (SELECT x.passed FROM assessment_attempts x WHERE x.candidate_id = cp.user_id AND x.module_id = m.id AND x.status IN ('passed','failed','timed_out') ORDER BY x.submitted_at DESC NULLS LAST LIMIT 1),
          'last_attempt_at', (SELECT max(x.submitted_at) FROM assessment_attempts x WHERE x.candidate_id = cp.user_id AND x.module_id = m.id)
        ) ORDER BY m.module_number)
        FROM academy_modules m LEFT JOIN module_progress mp ON mp.module_id = m.id AND mp.candidate_id = cp.user_id
        WHERE m.status = 'active') AS modules,
      (SELECT jsonb_build_object('attempts', count(*), 'best_score', max(x.score_percent), 'passed', coalesce(bool_or(x.passed), false))
        FROM assessment_attempts x JOIN assessment_configs c ON c.id = x.config_id
        WHERE x.candidate_id = cp.user_id AND c.scope = 'final' AND x.status IN ('passed','failed','timed_out')) AS final,
      (SELECT n.status FROM coaching_notes n WHERE n.candidate_id = cp.user_id ORDER BY n.updated_at DESC LIMIT 1) AS coaching_status,
      (SELECT count(*) FROM coaching_notes n WHERE n.candidate_id = cp.user_id AND n.status <> 'resolved') AS open_notes,
      (SELECT min(n.follow_up_date) FROM coaching_notes n WHERE n.candidate_id = cp.user_id AND n.status <> 'resolved' AND n.follow_up_date IS NOT NULL) AS next_follow_up
    FROM candidate_profiles cp
    JOIN profiles p ON p.id = cp.user_id
    LEFT JOIN trainee_assignments a ON a.candidate_id = cp.user_id AND a.status = 'active'
    LEFT JOIN teams tm ON tm.id = a.team_id
    LEFT JOIN profiles tp ON tp.id = a.trainer_id
    WHERE cp.user_id <> _me AND public.can_view_candidate(_me, cp.user_id)
  ) t;
  RETURN _res;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_create_team(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_team_manager(uuid, uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_assign_trainer(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_end_assignment(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_coaching_note(uuid, text, public.coaching_status, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_coaching_note(uuid, text, public.coaching_status, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.staff_trainee_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_team(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_team_manager(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_trainer(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_end_assignment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_coaching_note(uuid, text, public.coaching_status, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_coaching_note(uuid, text, public.coaching_status, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_trainee_overview() TO authenticated;