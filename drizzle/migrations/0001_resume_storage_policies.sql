-- Resume files live at <job_seeker_id>/<filename> in the private "resumes" bucket
CREATE POLICY "resume files read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'resumes'
    AND public.can_view_seeker(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "resume files insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "resume files update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "resume files delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'resumes'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );