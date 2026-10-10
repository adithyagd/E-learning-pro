CREATE POLICY "Recruitment resumes admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'recruitment-resumes' AND public.has_role(auth.uid(), 'admin'));