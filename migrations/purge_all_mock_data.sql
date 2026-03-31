-- PURGE SCRIPT: Remove all seed and mock data from Creeda
-- Run this to start with a clean Slate.

-- platform_practitioners removed
TRUNCATE TABLE public.platform_events CASCADE;
TRUNCATE TABLE public.daily_load_logs CASCADE;
TRUNCATE TABLE public.computed_intelligence CASCADE;
TRUNCATE TABLE public.referrals CASCADE;
TRUNCATE TABLE public.team_members CASCADE;
TRUNCATE TABLE public.teams CASCADE;
TRUNCATE TABLE public.diagnostics CASCADE;

-- Note: This does NOT delete user profiles to avoid auth issues.
-- To clear profiles as well:
-- TRUNCATE TABLE public.profiles CASCADE;
