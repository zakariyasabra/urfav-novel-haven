
-- site_settings: allowlist instead of blocklist
DROP POLICY IF EXISTS "public read non-sensitive" ON public.site_settings;
CREATE POLICY "public read allowlist"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (key IN (
    'site_name','site_tagline','site_logo_url','site_favicon_url',
    'brand_primary','brand_accent','contact_email','contact_phone',
    'social_facebook','social_twitter','social_instagram','social_youtube',
    'social_telegram','social_discord','announcement_banner',
    'default_currency','default_language','maintenance_mode',
    'meta_description','meta_keywords','og_image_url','footer_text',
    'terms_url','privacy_url','faq_url','support_url'
  ));

-- storage: restrict payment-qr read to admins
DROP POLICY IF EXISTS "qr auth read" ON storage.objects;
CREATE POLICY "qr admin read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-qr' AND public.has_any_admin_role(auth.uid()));
