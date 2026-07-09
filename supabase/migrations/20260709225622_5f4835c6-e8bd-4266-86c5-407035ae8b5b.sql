
-- 1) Extend role enum with 'author'
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'author';

-- Commit enum before use in a separate statement batch handled by tool.
