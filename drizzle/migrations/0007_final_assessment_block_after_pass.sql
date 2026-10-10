CREATE OR REPLACE FUNCTION public.guard_final_after_pass()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT scope FROM assessment_configs WHERE id = NEW.config_id) = 'final'
     AND EXISTS (SELECT 1 FROM assessment_attempts WHERE candidate_id = NEW.candidate_id AND config_id = NEW.config_id AND passed) THEN
    RAISE EXCEPTION 'Final Assessment already passed';
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.guard_final_after_pass() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER assessment_attempts_final_after_pass BEFORE INSERT ON public.assessment_attempts
FOR EACH ROW EXECUTE FUNCTION public.guard_final_after_pass();