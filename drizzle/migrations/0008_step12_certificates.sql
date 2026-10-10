ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'certificate_requested';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'certificate_rejected';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'certificate_rereviewed';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'certificate_revoked';
ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'certificate_downloaded';

CREATE TYPE public.certificate_status AS ENUM ('pending_approval','approved','rejected','issued','revoked');

CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number text NOT NULL UNIQUE DEFAULT ('E2E-RT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,16))),
  candidate_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  program text NOT NULL DEFAULT 'Recruitment Operations Training',
  status public.certificate_status NOT NULL DEFAULT 'pending_approval',
  final_attempt_id uuid REFERENCES public.assessment_attempts(id),
  final_score numeric,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  issued_at timestamptz,
  revoked_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id),
  rejection_reason text,
  revocation_reason text,
  issuer_name text,
  pdf_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, program)
);
GRANT SELECT ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View permitted certificates" ON public.certificates FOR SELECT TO authenticated
  USING (public.can_view_candidate(auth.uid(), candidate_id));
CREATE TRIGGER certificates_updated_at BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Create the pending request when a final attempt passes (server-side only).
CREATE OR REPLACE FUNCTION public.request_certificate_on_final_pass()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _scope text; _id uuid;
BEGIN
  IF NEW.passed IS TRUE AND (OLD.passed IS DISTINCT FROM TRUE) THEN
    SELECT scope INTO _scope FROM assessment_configs WHERE id = NEW.config_id;
    IF _scope = 'final' THEN
      INSERT INTO certificates (candidate_id, final_attempt_id, final_score, evidence)
      VALUES (NEW.candidate_id, NEW.id, NEW.score_percent,
        jsonb_build_object('final_attempt_id', NEW.id, 'submitted_at', NEW.submitted_at))
      ON CONFLICT (candidate_id, program) DO NOTHING
      RETURNING id INTO _id;
      IF _id IS NOT NULL THEN
        INSERT INTO activity_logs (user_id, action, role, target_user_id, metadata)
        VALUES (NEW.candidate_id, 'certificate_requested', 'candidate', NEW.candidate_id,
          jsonb_build_object('certificate_id', _id));
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER final_pass_certificate_request AFTER UPDATE ON public.assessment_attempts
  FOR EACH ROW EXECUTE FUNCTION public.request_certificate_on_final_pass();

-- Backfill: any already-passed final attempts.
INSERT INTO public.certificates (candidate_id, final_attempt_id, final_score, evidence)
SELECT DISTINCT ON (a.candidate_id) a.candidate_id, a.id, a.score_percent,
  jsonb_build_object('final_attempt_id', a.id, 'submitted_at', a.submitted_at)
FROM public.assessment_attempts a JOIN public.assessment_configs c ON c.id = a.config_id
WHERE c.scope = 'final' AND a.passed IS TRUE
ORDER BY a.candidate_id, a.submitted_at
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public._cert_log(_c public.certificates, _action text, _extra jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO activity_logs (user_id, action, role, target_user_id, metadata)
  VALUES (auth.uid(), _action::activity_action, 'admin', _c.candidate_id,
    jsonb_build_object('certificate_id', _c.id, 'certificate_number', _c.certificate_number) || _extra);
$$;
REVOKE ALL ON FUNCTION public._cert_log(public.certificates, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._require_admin() RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
END $$;

-- Approve: verifies eligibility server-side. Idempotent for an already-approved (not yet issued) record.
CREATE OR REPLACE FUNCTION public.approve_certificate(_cert uuid)
RETURNS public.certificates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c certificates; _name text; _att assessment_attempts;
BEGIN
  PERFORM _require_admin();
  SELECT * INTO c FROM certificates WHERE id = _cert FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Certificate not found'; END IF;
  IF c.candidate_id = auth.uid() THEN RAISE EXCEPTION 'Cannot approve own certificate'; END IF;
  IF c.status = 'approved' THEN RETURN c; END IF;
  IF c.status <> 'pending_approval' THEN RAISE EXCEPTION 'Certificate is not pending approval'; END IF;
  SELECT * INTO _att FROM assessment_attempts WHERE id = c.final_attempt_id;
  IF NOT FOUND OR _att.passed IS NOT TRUE OR _att.score_percent < _att.pass_mark
     OR NOT is_final_assessment_eligible(c.candidate_id) THEN
    RAISE EXCEPTION 'Candidate is not eligible';
  END IF;
  SELECT coalesce(nullif(p.full_name,''), 'Academy Administrator') || coalesce(' — ' || nullif(s.job_title,''), '')
    INTO _name FROM profiles p LEFT JOIN staff_profiles s ON s.user_id = p.id WHERE p.id = auth.uid();
  UPDATE certificates SET status = 'approved', approved_at = now(), reviewed_at = now(),
    reviewed_by = auth.uid(), issuer_name = _name, final_score = _att.score_percent
    WHERE id = _cert RETURNING * INTO c;
  PERFORM _cert_log(c, 'certificate_approved', '{}'::jsonb);
  RETURN c;
END $$;

-- Mark issued only after the PDF was generated and stored.
CREATE OR REPLACE FUNCTION public.mark_certificate_issued(_cert uuid, _path text)
RETURNS public.certificates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c certificates;
BEGIN
  PERFORM _require_admin();
  SELECT * INTO c FROM certificates WHERE id = _cert FOR UPDATE;
  IF NOT FOUND OR c.status <> 'approved' THEN RAISE EXCEPTION 'Certificate is not approved'; END IF;
  IF coalesce(_path,'') = '' THEN RAISE EXCEPTION 'Missing PDF'; END IF;
  UPDATE certificates SET status = 'issued', issued_at = now(), pdf_path = _path
    WHERE id = _cert RETURNING * INTO c;
  PERFORM _cert_log(c, 'certificate_issued', '{}'::jsonb);
  UPDATE candidate_profiles SET academy_status = 'certified' WHERE user_id = c.candidate_id;
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.reject_certificate(_cert uuid, _reason text)
RETURNS public.certificates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c certificates;
BEGIN
  PERFORM _require_admin();
  IF length(trim(coalesce(_reason,''))) < 3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
  SELECT * INTO c FROM certificates WHERE id = _cert FOR UPDATE;
  IF NOT FOUND OR c.status <> 'pending_approval' THEN RAISE EXCEPTION 'Certificate is not pending approval'; END IF;
  UPDATE certificates SET status = 'rejected', rejected_at = now(), reviewed_at = now(),
    reviewed_by = auth.uid(), rejection_reason = trim(_reason) WHERE id = _cert RETURNING * INTO c;
  PERFORM _cert_log(c, 'certificate_rejected', jsonb_build_object('reason', trim(_reason)));
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.rereview_certificate(_cert uuid)
RETURNS public.certificates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c certificates;
BEGIN
  PERFORM _require_admin();
  SELECT * INTO c FROM certificates WHERE id = _cert FOR UPDATE;
  IF NOT FOUND OR c.status <> 'rejected' THEN RAISE EXCEPTION 'Certificate is not rejected'; END IF;
  UPDATE certificates SET status = 'pending_approval', reviewed_at = now(), reviewed_by = auth.uid()
    WHERE id = _cert RETURNING * INTO c;
  PERFORM _cert_log(c, 'certificate_rereviewed', jsonb_build_object('previous_reason', c.rejection_reason));
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.revoke_certificate(_cert uuid, _reason text)
RETURNS public.certificates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c certificates;
BEGIN
  PERFORM _require_admin();
  IF length(trim(coalesce(_reason,''))) < 3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
  SELECT * INTO c FROM certificates WHERE id = _cert FOR UPDATE;
  IF NOT FOUND OR c.status <> 'issued' THEN RAISE EXCEPTION 'Certificate is not issued'; END IF;
  UPDATE certificates SET status = 'revoked', revoked_at = now(), reviewed_by = auth.uid(),
    revocation_reason = trim(_reason) WHERE id = _cert RETURNING * INTO c;
  PERFORM _cert_log(c, 'certificate_revoked', jsonb_build_object('reason', trim(_reason)));
  RETURN c;
END $$;

-- Public verification: minimal fields only.
CREATE OR REPLACE FUNCTION public.verify_certificate(_number text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('certificate_number', c.certificate_number, 'candidate_name', p.full_name,
    'program', c.program, 'issued_at', c.issued_at,
    'status', CASE WHEN c.status = 'issued' THEN 'valid' ELSE 'revoked' END)
  FROM certificates c JOIN profiles p ON p.id = c.candidate_id
  WHERE c.certificate_number = upper(trim(_number)) AND c.status IN ('issued','revoked');
$$;

-- Admin list view (RLS of underlying tables applies).
CREATE VIEW public.certificate_directory WITH (security_invoker = true) AS
SELECT c.id, c.certificate_number, c.candidate_id, c.program, c.status, c.final_score,
  c.requested_at, c.reviewed_at, c.approved_at, c.rejected_at, c.issued_at, c.revoked_at,
  c.rejection_reason, c.revocation_reason, c.issuer_name, c.pdf_path,
  p.full_name, p.email, cp.employee_id,
  (SELECT count(*) FROM module_progress mp WHERE mp.candidate_id = c.candidate_id AND mp.status = 'completed')::int AS completed_modules,
  (SELECT count(*) FROM academy_modules m WHERE m.status = 'active')::int AS total_modules,
  a.passed AS final_passed, a.pass_mark
FROM certificates c
JOIN profiles p ON p.id = c.candidate_id
LEFT JOIN candidate_profiles cp ON cp.user_id = c.candidate_id
LEFT JOIN assessment_attempts a ON a.id = c.final_attempt_id;
GRANT SELECT ON public.certificate_directory TO authenticated;

REVOKE EXECUTE ON FUNCTION public.approve_certificate(uuid), public.mark_certificate_issued(uuid,text),
  public.reject_certificate(uuid,text), public.rereview_certificate(uuid), public.revoke_certificate(uuid,text),
  public.request_certificate_on_final_pass(), public._require_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_certificate(uuid), public.mark_certificate_issued(uuid,text),
  public.reject_certificate(uuid,text), public.rereview_certificate(uuid), public.revoke_certificate(uuid,text),
  public._require_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;