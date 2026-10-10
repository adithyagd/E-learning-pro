CREATE SEQUENCE public.job_requirement_code_seq;
CREATE SEQUENCE public.recruitment_candidate_code_seq;

CREATE TABLE public.job_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_code text NOT NULL UNIQUE DEFAULT ('REQ-' || lpad(nextval('public.job_requirement_code_seq')::text, 4, '0')),
  title text NOT NULL,
  client_name text,
  description text,
  required_skills text[] NOT NULL DEFAULT '{}',
  experience text,
  location text,
  openings integer CHECK (openings IS NULL OR openings BETWEEN 1 AND 10000),
  priority public.requirement_priority NOT NULL DEFAULT 'normal',
  status public.requirement_status NOT NULL DEFAULT 'draft',
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  assigned_recruiter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  details_verified boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.job_requirements TO authenticated;
GRANT ALL ON public.job_requirements TO service_role;
ALTER TABLE public.job_requirements ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.recruitment_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_code text NOT NULL UNIQUE DEFAULT ('RC-' || lpad(nextval('public.recruitment_candidate_code_seq')::text, 5, '0')),
  full_name text NOT NULL,
  email text,
  phone text,
  contact_verified boolean NOT NULL DEFAULT false,
  skills text[] NOT NULL DEFAULT '{}',
  experience text,
  location text,
  source text NOT NULL,
  details_verified boolean NOT NULL DEFAULT false,
  resume_path text,
  requirement_id uuid REFERENCES public.job_requirements(id) ON DELETE RESTRICT,
  recruiter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  stage public.recruitment_stage NOT NULL DEFAULT 'sourced',
  stage_changed_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX recruitment_candidates_req_email_uq ON public.recruitment_candidates (requirement_id, lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX recruitment_candidates_req_phone_uq ON public.recruitment_candidates (requirement_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX ON public.recruitment_candidates (requirement_id);
CREATE INDEX ON public.recruitment_candidates (recruiter_id);
GRANT SELECT ON public.recruitment_candidates TO authenticated;
GRANT ALL ON public.recruitment_candidates TO service_role;
ALTER TABLE public.recruitment_candidates ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.recruitment_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  requirement_id uuid REFERENCES public.job_requirements(id) ON DELETE SET NULL,
  from_stage public.recruitment_stage,
  to_stage public.recruitment_stage NOT NULL,
  note text,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.recruitment_stage_history (candidate_id, changed_at);
GRANT SELECT ON public.recruitment_stage_history TO authenticated;
GRANT ALL ON public.recruitment_stage_history TO service_role;
ALTER TABLE public.recruitment_stage_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.recruitment_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  requirement_id uuid REFERENCES public.job_requirements(id) ON DELETE SET NULL,
  activity_type public.recruitment_activity_type NOT NULL,
  occurred_at timestamptz NOT NULL,
  notes text,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.recruitment_activities (candidate_id, occurred_at);
GRANT SELECT ON public.recruitment_activities TO authenticated;
GRANT ALL ON public.recruitment_activities TO service_role;
ALTER TABLE public.recruitment_activities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.recruitment_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
  requirement_id uuid REFERENCES public.job_requirements(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  round text NOT NULL,
  interviewer text,
  status public.interview_status NOT NULL DEFAULT 'scheduled',
  outcome text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recruitment_interviews TO authenticated;
GRANT ALL ON public.recruitment_interviews TO service_role;
ALTER TABLE public.recruitment_interviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.recruitment_interview_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.recruitment_interviews(id) ON DELETE CASCADE,
  previous_scheduled_at timestamptz,
  new_scheduled_at timestamptz NOT NULL,
  previous_status public.interview_status,
  new_status public.interview_status NOT NULL,
  note text,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recruitment_interview_events TO authenticated;
GRANT ALL ON public.recruitment_interview_events TO service_role;
ALTER TABLE public.recruitment_interview_events ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_job_requirements_updated BEFORE UPDATE ON public.job_requirements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_recruitment_candidates_updated BEFORE UPDATE ON public.recruitment_candidates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_recruitment_interviews_updated BEFORE UPDATE ON public.recruitment_interviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Access helpers
CREATE OR REPLACE FUNCTION public.can_access_requirement(_u uuid, _req uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _u IS NOT NULL AND (
    public.has_role(_u, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.job_requirements r
      WHERE r.id = _req AND (
        r.assigned_recruiter_id = _u
        OR (r.team_id IS NOT NULL AND public.has_role(_u, 'manager')
            AND EXISTS (SELECT 1 FROM public.team_managers tm WHERE tm.team_id = r.team_id AND tm.manager_id = _u))
      )
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_recruitment_candidate(_u uuid, _c uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _u IS NOT NULL AND (
    public.has_role(_u, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.recruitment_candidates c
      WHERE c.id = _c AND (
        c.recruiter_id = _u
        OR (c.requirement_id IS NOT NULL AND public.can_access_requirement(_u, c.requirement_id))
      )
    )
  )
$$;

-- Edit = admin, or the recruiter assigned to the candidate or its requirement. Managers are read-only.
CREATE OR REPLACE FUNCTION public.can_edit_recruitment_candidate(_u uuid, _c uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _u IS NOT NULL AND (
    public.has_role(_u, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.recruitment_candidates c
      LEFT JOIN public.job_requirements r ON r.id = c.requirement_id
      WHERE c.id = _c AND (c.recruiter_id = _u OR r.assigned_recruiter_id = _u)
    )
  )
$$;

CREATE POLICY "Scoped read requirements" ON public.job_requirements FOR SELECT TO authenticated USING (public.can_access_requirement(auth.uid(), id));
CREATE POLICY "Scoped read recruitment candidates" ON public.recruitment_candidates FOR SELECT TO authenticated USING (public.can_access_recruitment_candidate(auth.uid(), id));
CREATE POLICY "Scoped read stage history" ON public.recruitment_stage_history FOR SELECT TO authenticated USING (public.can_access_recruitment_candidate(auth.uid(), candidate_id));
CREATE POLICY "Scoped read recruitment activities" ON public.recruitment_activities FOR SELECT TO authenticated USING (public.can_access_recruitment_candidate(auth.uid(), candidate_id));
CREATE POLICY "Scoped read interviews" ON public.recruitment_interviews FOR SELECT TO authenticated USING (public.can_access_recruitment_candidate(auth.uid(), candidate_id));
CREATE POLICY "Scoped read interview events" ON public.recruitment_interview_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.recruitment_interviews i WHERE i.id = interview_id AND public.can_access_recruitment_candidate(auth.uid(), i.candidate_id))
);

CREATE OR REPLACE FUNCTION public._rec_actor()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := auth.uid();
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _u AND account_status = 'active') THEN
    RAISE EXCEPTION 'Account is not active' USING ERRCODE = '42501';
  END IF;
  RETURN _u;
END $$;

CREATE OR REPLACE FUNCTION public._rec_clean(_t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(btrim(_t), '')
$$;

CREATE OR REPLACE FUNCTION public._rec_log(_actor uuid, _action public.activity_action, _meta jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.activity_logs (user_id, action, metadata) VALUES (_actor, _action, COALESCE(_meta, '{}'::jsonb));
$$;

-- Requirements (admin only)
CREATE OR REPLACE FUNCTION public.save_job_requirement(
  _id uuid, _title text, _client text, _description text, _skills text[], _experience text,
  _location text, _openings integer, _priority public.requirement_priority, _status public.requirement_status,
  _team uuid, _recruiter uuid, _verified boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := public._rec_actor(); _rid uuid; _skl text[];
BEGIN
  IF NOT public.has_role(_u, 'admin') THEN RAISE EXCEPTION 'Only administrators can manage job requirements' USING ERRCODE = '42501'; END IF;
  IF public._rec_clean(_title) IS NULL OR length(_title) > 200 THEN RAISE EXCEPTION 'Job title is required (max 200 characters)'; END IF;
  IF _openings IS NOT NULL AND (_openings < 1 OR _openings > 10000) THEN RAISE EXCEPTION 'Openings must be between 1 and 10000'; END IF;
  IF length(COALESCE(_description,'')) > 10000 THEN RAISE EXCEPTION 'Description is too long'; END IF;
  IF _team IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.teams WHERE id = _team) THEN RAISE EXCEPTION 'Team not found'; END IF;
  IF _recruiter IS NOT NULL AND NOT (public.has_role(_recruiter, 'candidate') OR public.has_role(_recruiter, 'manager') OR public.has_role(_recruiter, 'admin')) THEN
    RAISE EXCEPTION 'Assigned recruiter must be a recruiter, manager or admin account';
  END IF;
  SELECT COALESCE(array_agg(DISTINCT s), '{}') INTO _skl FROM (SELECT btrim(x) s FROM unnest(COALESCE(_skills,'{}')) x) q WHERE s <> '';
  IF _id IS NULL THEN
    INSERT INTO public.job_requirements (title, client_name, description, required_skills, experience, location, openings, priority, status, team_id, assigned_recruiter_id, details_verified, created_by)
    VALUES (btrim(_title), public._rec_clean(_client), public._rec_clean(_description), _skl, public._rec_clean(_experience), public._rec_clean(_location), _openings, COALESCE(_priority,'normal'), COALESCE(_status,'draft'), _team, _recruiter, COALESCE(_verified,false), _u)
    RETURNING id INTO _rid;
    PERFORM public._rec_log(_u, 'recruitment_requirement_created', jsonb_build_object('requirement_id', _rid));
  ELSE
    UPDATE public.job_requirements SET title = btrim(_title), client_name = public._rec_clean(_client), description = public._rec_clean(_description),
      required_skills = _skl, experience = public._rec_clean(_experience), location = public._rec_clean(_location), openings = _openings,
      priority = COALESCE(_priority, priority), status = COALESCE(_status, status), team_id = _team, assigned_recruiter_id = _recruiter, details_verified = COALESCE(_verified,false)
    WHERE id = _id RETURNING id INTO _rid;
    IF _rid IS NULL THEN RAISE EXCEPTION 'Requirement not found'; END IF;
    PERFORM public._rec_log(_u, 'recruitment_requirement_updated', jsonb_build_object('requirement_id', _rid, 'status', _status));
  END IF;
  RETURN _rid;
END $$;

-- Candidates
CREATE OR REPLACE FUNCTION public.save_recruitment_candidate(
  _id uuid, _name text, _email text, _phone text, _contact_verified boolean, _skills text[], _experience text,
  _location text, _source text, _details_verified boolean, _requirement uuid, _recruiter uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := public._rec_actor(); _cid uuid; _skl text[]; _em text := lower(public._rec_clean(_email)); _ph text := public._rec_clean(_phone);
  _admin boolean := public.has_role(_u, 'admin');
BEGIN
  IF public._rec_clean(_name) IS NULL OR length(_name) > 200 THEN RAISE EXCEPTION 'Candidate name is required'; END IF;
  IF public._rec_clean(_source) IS NULL THEN RAISE EXCEPTION 'Source of the candidate record is required'; END IF;
  IF _em IS NOT NULL AND _em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Email address is not valid'; END IF;
  IF _ph IS NOT NULL AND _ph !~ '^[0-9+()\-\s]{6,20}$' THEN RAISE EXCEPTION 'Phone number is not valid'; END IF;
  IF _requirement IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.job_requirements WHERE id = _requirement) THEN RAISE EXCEPTION 'Requirement not found'; END IF;
  IF NOT _admin THEN
    IF _requirement IS NULL OR NOT EXISTS (SELECT 1 FROM public.job_requirements WHERE id = _requirement AND assigned_recruiter_id = _u) THEN
      RAISE EXCEPTION 'You can only add candidates to requirements assigned to you' USING ERRCODE = '42501';
    END IF;
    _recruiter := _u;
  END IF;
  IF _recruiter IS NOT NULL AND NOT (public.has_role(_recruiter, 'candidate') OR public.has_role(_recruiter, 'manager') OR public.has_role(_recruiter, 'admin')) THEN
    RAISE EXCEPTION 'Assigned recruiter must be a recruiter, manager or admin account';
  END IF;
  SELECT COALESCE(array_agg(DISTINCT s), '{}') INTO _skl FROM (SELECT btrim(x) s FROM unnest(COALESCE(_skills,'{}')) x) q WHERE s <> '';
  IF _id IS NULL THEN
    INSERT INTO public.recruitment_candidates (full_name, email, phone, contact_verified, skills, experience, location, source, details_verified, requirement_id, recruiter_id, created_by)
    VALUES (btrim(_name), _em, _ph, COALESCE(_contact_verified,false) AND (_em IS NOT NULL OR _ph IS NOT NULL), _skl, public._rec_clean(_experience), public._rec_clean(_location), btrim(_source), COALESCE(_details_verified,false), _requirement, _recruiter, _u)
    RETURNING id INTO _cid;
    INSERT INTO public.recruitment_stage_history (candidate_id, requirement_id, from_stage, to_stage, note, changed_by) VALUES (_cid, _requirement, NULL, 'sourced', 'Record created', _u);
    INSERT INTO public.recruitment_activities (candidate_id, requirement_id, activity_type, occurred_at, notes, recorded_by) VALUES (_cid, _requirement, 'sourced', now(), 'Source: ' || btrim(_source), _u);
    PERFORM public._rec_log(_u, 'recruitment_candidate_created', jsonb_build_object('recruitment_candidate_id', _cid, 'requirement_id', _requirement));
  ELSE
    IF NOT public.can_edit_recruitment_candidate(_u, _id) THEN RAISE EXCEPTION 'Not authorised to edit this candidate' USING ERRCODE = '42501'; END IF;
    UPDATE public.recruitment_candidates SET full_name = btrim(_name), email = _em, phone = _ph,
      contact_verified = COALESCE(_contact_verified,false) AND (_em IS NOT NULL OR _ph IS NOT NULL), skills = _skl,
      experience = public._rec_clean(_experience), location = public._rec_clean(_location), source = btrim(_source),
      details_verified = COALESCE(_details_verified,false), requirement_id = _requirement, recruiter_id = _recruiter
    WHERE id = _id RETURNING id INTO _cid;
    PERFORM public._rec_log(_u, 'recruitment_candidate_updated', jsonb_build_object('recruitment_candidate_id', _cid));
  END IF;
  RETURN _cid;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'A candidate with this email or phone already exists for this requirement';
END $$;

CREATE OR REPLACE FUNCTION public.recruitment_transition_allowed(_from public.recruitment_stage, _to public.recruitment_stage)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  _main public.recruitment_stage[] := ARRAY['sourced','contacted','interested','screened','shortlisted','interview_scheduled','interview_attended','selected','offered','offer_accepted','joined']::public.recruitment_stage[];
  _fi int := array_position(_main, _from); _ti int := array_position(_main, _to);
BEGIN
  IF _from = _to THEN RETURN false; END IF;
  IF _from IN ('rejected','not_interested','dropout','absconded') THEN RETURN false; END IF;
  IF _from = 'joined' THEN RETURN _to = 'absconded'; END IF;
  IF _to = 'absconded' THEN RETURN _from = 'offer_accepted'; END IF;
  IF _ti IS NULL THEN RETURN true; END IF;              -- exceptional status from any open state
  IF _fi IS NULL THEN RETURN true; END IF;              -- resume from On Hold / No Response
  RETURN _ti > _fi;                                     -- forward only, skipping allowed
END $$;

CREATE OR REPLACE FUNCTION public.change_recruitment_stage(_candidate uuid, _to public.recruitment_stage, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := public._rec_actor(); _c public.recruitment_candidates;
BEGIN
  IF NOT public.can_edit_recruitment_candidate(_u, _candidate) THEN RAISE EXCEPTION 'Not authorised to change this candidate''s stage' USING ERRCODE = '42501'; END IF;
  SELECT * INTO _c FROM public.recruitment_candidates WHERE id = _candidate FOR UPDATE;
  IF NOT public.recruitment_transition_allowed(_c.stage, _to) THEN
    RAISE EXCEPTION 'Invalid stage change from % to %', _c.stage, _to;
  END IF;
  IF length(COALESCE(_note,'')) > 2000 THEN RAISE EXCEPTION 'Note is too long'; END IF;
  UPDATE public.recruitment_candidates SET stage = _to, stage_changed_at = now() WHERE id = _candidate;
  INSERT INTO public.recruitment_stage_history (candidate_id, requirement_id, from_stage, to_stage, note, changed_by)
  VALUES (_candidate, _c.requirement_id, _c.stage, _to, public._rec_clean(_note), _u);
  PERFORM public._rec_log(_u, 'recruitment_stage_changed', jsonb_build_object('recruitment_candidate_id', _candidate, 'from', _c.stage, 'to', _to));
END $$;

CREATE OR REPLACE FUNCTION public.record_recruitment_activity(_candidate uuid, _type public.recruitment_activity_type, _occurred timestamptz, _notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := public._rec_actor(); _id uuid; _req uuid;
BEGIN
  IF NOT public.can_edit_recruitment_candidate(_u, _candidate) THEN RAISE EXCEPTION 'Not authorised to record activity for this candidate' USING ERRCODE = '42501'; END IF;
  IF _occurred IS NULL OR _occurred > now() + interval '5 minutes' THEN RAISE EXCEPTION 'Activity date must not be in the future'; END IF;
  IF _type = 'note' AND public._rec_clean(_notes) IS NULL THEN RAISE EXCEPTION 'A note is required'; END IF;
  IF length(COALESCE(_notes,'')) > 4000 THEN RAISE EXCEPTION 'Notes are too long'; END IF;
  SELECT requirement_id INTO _req FROM public.recruitment_candidates WHERE id = _candidate;
  INSERT INTO public.recruitment_activities (candidate_id, requirement_id, activity_type, occurred_at, notes, recorded_by)
  VALUES (_candidate, _req, _type, _occurred, public._rec_clean(_notes), _u) RETURNING id INTO _id;
  PERFORM public._rec_log(_u, 'recruitment_activity_recorded', jsonb_build_object('recruitment_candidate_id', _candidate, 'type', _type));
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.save_recruitment_interview(_id uuid, _candidate uuid, _scheduled timestamptz, _round text, _interviewer text,
  _status public.interview_status, _outcome text, _notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := public._rec_actor(); _i public.recruitment_interviews; _rid uuid; _req uuid; _new_status public.interview_status;
BEGIN
  IF _scheduled IS NULL THEN RAISE EXCEPTION 'Interview date and time are required'; END IF;
  IF public._rec_clean(_round) IS NULL THEN RAISE EXCEPTION 'Interview round is required'; END IF;
  IF _outcome IS NOT NULL AND public._rec_clean(_outcome) IS NOT NULL AND COALESCE(_status,'scheduled') <> 'completed' THEN
    RAISE EXCEPTION 'An outcome can only be recorded for a completed interview';
  END IF;
  IF _id IS NULL THEN
    IF NOT public.can_edit_recruitment_candidate(_u, _candidate) THEN RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501'; END IF;
    IF _scheduled < now() - interval '1 day' THEN RAISE EXCEPTION 'A new interview cannot be scheduled in the past'; END IF;
    SELECT requirement_id INTO _req FROM public.recruitment_candidates WHERE id = _candidate;
    _new_status := COALESCE(_status, 'scheduled');
    IF _new_status NOT IN ('scheduled','confirmed') THEN RAISE EXCEPTION 'A new interview must start as Scheduled or Confirmed'; END IF;
    INSERT INTO public.recruitment_interviews (candidate_id, requirement_id, scheduled_at, round, interviewer, status, notes, created_by)
    VALUES (_candidate, _req, _scheduled, btrim(_round), public._rec_clean(_interviewer), _new_status, public._rec_clean(_notes), _u) RETURNING id INTO _rid;
    INSERT INTO public.recruitment_interview_events (interview_id, previous_scheduled_at, new_scheduled_at, previous_status, new_status, changed_by)
    VALUES (_rid, NULL, _scheduled, NULL, _new_status, _u);
    INSERT INTO public.recruitment_activities (candidate_id, requirement_id, activity_type, occurred_at, notes, recorded_by)
    VALUES (_candidate, _req, 'interview_scheduled', now(), btrim(_round), _u);
  ELSE
    SELECT * INTO _i FROM public.recruitment_interviews WHERE id = _id FOR UPDATE;
    IF _i.id IS NULL OR NOT public.can_edit_recruitment_candidate(_u, _i.candidate_id) THEN RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501'; END IF;
    _new_status := COALESCE(_status, _i.status);
    IF _scheduled <> _i.scheduled_at AND _new_status IN ('scheduled','confirmed') THEN _new_status := 'rescheduled'; END IF;
    IF _new_status = 'completed' AND _scheduled > now() THEN RAISE EXCEPTION 'An interview in the future cannot be marked completed'; END IF;
    UPDATE public.recruitment_interviews SET scheduled_at = _scheduled, round = btrim(_round), interviewer = public._rec_clean(_interviewer),
      status = _new_status, outcome = CASE WHEN _new_status = 'completed' THEN public._rec_clean(_outcome) ELSE NULL END, notes = public._rec_clean(_notes)
    WHERE id = _id RETURNING id INTO _rid;
    IF _scheduled <> _i.scheduled_at OR _new_status <> _i.status THEN
      INSERT INTO public.recruitment_interview_events (interview_id, previous_scheduled_at, new_scheduled_at, previous_status, new_status, changed_by)
      VALUES (_rid, _i.scheduled_at, _scheduled, _i.status, _new_status, _u);
    END IF;
    IF _new_status = 'completed' AND _i.status <> 'completed' THEN
      INSERT INTO public.recruitment_activities (candidate_id, requirement_id, activity_type, occurred_at, notes, recorded_by)
      VALUES (_i.candidate_id, _i.requirement_id, 'interview_outcome', now(), public._rec_clean(_outcome), _u);
    END IF;
  END IF;
  PERFORM public._rec_log(_u, 'recruitment_interview_saved', jsonb_build_object('interview_id', _rid, 'status', _new_status));
  RETURN _rid;
END $$;

CREATE OR REPLACE FUNCTION public.set_recruitment_resume(_candidate uuid, _path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := public._rec_actor();
BEGIN
  IF NOT public.can_edit_recruitment_candidate(_u, _candidate) THEN RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501'; END IF;
  IF _path IS NULL OR split_part(_path, '/', 1) <> _candidate::text THEN RAISE EXCEPTION 'Invalid resume path'; END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'recruitment-resumes' AND name = _path) THEN RAISE EXCEPTION 'Resume file not found'; END IF;
  UPDATE public.recruitment_candidates SET resume_path = _path WHERE id = _candidate;
  PERFORM public._rec_log(_u, 'recruitment_candidate_updated', jsonb_build_object('recruitment_candidate_id', _candidate, 'resume', true));
END $$;

-- Staff the admin may assign to requirements (names only)
CREATE OR REPLACE FUNCTION public.recruitment_assignable_staff()
RETURNS TABLE(user_id uuid, full_name text, role public.app_role) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT p.id, COALESCE(p.full_name, p.email), r.role FROM public.profiles p JOIN public.user_roles r ON r.user_id = p.id
    WHERE r.role IN ('candidate','manager','admin') AND p.account_status = 'active' ORDER BY 2;
END $$;

-- Names of people referenced on records the caller can see
CREATE OR REPLACE FUNCTION public.recruitment_people(_ids uuid[])
RETURNS TABLE(id uuid, full_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, COALESCE(p.full_name, 'Staff member') FROM public.profiles p
  WHERE p.id = ANY(_ids) AND auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.job_requirements r WHERE public.can_access_requirement(auth.uid(), r.id) AND (r.assigned_recruiter_id = p.id OR r.created_by = p.id))
    OR EXISTS (SELECT 1 FROM public.recruitment_candidates c WHERE public.can_access_recruitment_candidate(auth.uid(), c.id) AND (c.recruiter_id = p.id OR c.created_by = p.id))
    OR EXISTS (SELECT 1 FROM public.recruitment_stage_history h WHERE h.changed_by = p.id AND public.can_access_recruitment_candidate(auth.uid(), h.candidate_id))
    OR EXISTS (SELECT 1 FROM public.recruitment_activities a WHERE a.recorded_by = p.id AND public.can_access_recruitment_candidate(auth.uid(), a.candidate_id))
  )
$$;

REVOKE ALL ON FUNCTION public.save_job_requirement(uuid,text,text,text,text[],text,text,integer,public.requirement_priority,public.requirement_status,uuid,uuid,boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_recruitment_candidate(uuid,text,text,text,boolean,text[],text,text,text,boolean,uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.change_recruitment_stage(uuid,public.recruitment_stage,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_recruitment_activity(uuid,public.recruitment_activity_type,timestamptz,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_recruitment_interview(uuid,uuid,timestamptz,text,text,public.interview_status,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_recruitment_resume(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recruitment_assignable_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recruitment_people(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._rec_log(uuid,public.activity_action,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_job_requirement(uuid,text,text,text,text[],text,text,integer,public.requirement_priority,public.requirement_status,uuid,uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_recruitment_candidate(uuid,text,text,text,boolean,text[],text,text,text,boolean,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_recruitment_stage(uuid,public.recruitment_stage,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_recruitment_activity(uuid,public.recruitment_activity_type,timestamptz,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_recruitment_interview(uuid,uuid,timestamptz,text,text,public.interview_status,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_recruitment_resume(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recruitment_assignable_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.recruitment_people(uuid[]) TO authenticated;

-- Private resume storage
CREATE POLICY "Recruitment resumes scoped read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'recruitment-resumes' AND public.can_access_recruitment_candidate(auth.uid(), (NULLIF(split_part(name,'/',1),''))::uuid));
CREATE POLICY "Recruitment resumes scoped upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'recruitment-resumes' AND public.can_edit_recruitment_candidate(auth.uid(), (NULLIF(split_part(name,'/',1),''))::uuid)
    AND lower(name) ~ '\.(pdf|doc|docx)$');