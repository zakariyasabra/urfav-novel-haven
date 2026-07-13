
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pref_language text NOT NULL DEFAULT 'ar',
  ADD COLUMN IF NOT EXISTS pref_theme text NOT NULL DEFAULT 'system';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_pref_language_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pref_language_check CHECK (pref_language IN ('ar','en'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_pref_theme_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pref_theme_check CHECK (pref_theme IN ('dark','light','system'));
