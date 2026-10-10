CREATE OR REPLACE FUNCTION public.mark_certificate_issued(_cert uuid, _path text)
RETURNS public.certificates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c certificates;
BEGIN
  PERFORM _require_admin();
  SELECT * INTO c FROM certificates WHERE id = _cert FOR UPDATE;
  IF NOT FOUND OR c.status <> 'approved' THEN RAISE EXCEPTION 'Certificate is not approved'; END IF;
  IF coalesce(_path,'') = '' OR _path <> (c.candidate_id::text || '/' || c.certificate_number || '.pdf')
     OR NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'certificates' AND o.name = _path) THEN
    RAISE EXCEPTION 'Missing PDF';
  END IF;
  UPDATE certificates SET status = 'issued', issued_at = now(), pdf_path = _path
    WHERE id = _cert RETURNING * INTO c;
  PERFORM _cert_log(c, 'certificate_issued', '{}'::jsonb);
  UPDATE candidate_profiles SET academy_status = 'certified' WHERE user_id = c.candidate_id;
  RETURN c;
END $$;