
DROP POLICY IF EXISTS "qr public read" ON storage.objects;
DROP POLICY IF EXISTS "qr auth read" ON storage.objects;
CREATE POLICY "qr auth read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-qr');

DROP POLICY IF EXISTS "qr admin write" ON storage.objects;
CREATE POLICY "qr admin write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-qr' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "qr admin update" ON storage.objects;
CREATE POLICY "qr admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-qr' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "qr admin delete" ON storage.objects;
CREATE POLICY "qr admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payment-qr' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "proofs user upload" ON storage.objects;
CREATE POLICY "proofs user upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "proofs user read own" ON storage.objects;
CREATE POLICY "proofs user read own" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_any_admin_role(auth.uid()))
  );
