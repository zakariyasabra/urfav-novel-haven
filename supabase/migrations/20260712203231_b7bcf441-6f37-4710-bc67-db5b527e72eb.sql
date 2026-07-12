
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS qr_image_url TEXT,
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.coin_purchase_requests
  ADD COLUMN IF NOT EXISTS proof_image_url TEXT;

DROP POLICY IF EXISTS "admin manage methods" ON public.payment_methods;
CREATE POLICY "admin manage methods" ON public.payment_methods
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.payment_methods (code, name_ar, kind, enabled, sort_order, instructions, config)
VALUES
  ('paypal',        'باي بال',     'paypal', true, 1, 'أرسل المبلغ إلى بريد PayPal التالي ثم أدخل رقم المعاملة والمبلغ المحوّل وأرفق لقطة الشاشة.', '{"email":""}'::jsonb),
  ('usdt',          'USDT',        'crypto', true, 2, 'أرسل USDT إلى العنوان أدناه على الشبكة المحددة، ثم أدخل TXID.', '{"address":"","network":"TRC20"}'::jsonb),
  ('vodafone_cash', 'فودافون كاش', 'wallet', true, 3, 'حوّل المبلغ إلى الرقم أدناه ثم أدخل رقم العملية من رسالة التأكيد.', '{"number":""}'::jsonb),
  ('instapay',      'InstaPay',    'wallet', true, 4, 'حوّل عبر InstaPay إلى الحساب أدناه ثم أدخل مرجع التحويل.', '{"handle":""}'::jsonb)
ON CONFLICT (code) DO NOTHING;

DROP POLICY IF EXISTS "qr public read" ON storage.objects;
CREATE POLICY "qr public read" ON storage.objects FOR SELECT
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
