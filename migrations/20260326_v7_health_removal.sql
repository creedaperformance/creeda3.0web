-- CREEDA V6_Cleanup: Remove Health Data Integration
-- Drops tables and policies related to external health sync (Apple/Google).

DROP TABLE IF EXISTS public.health_daily_metrics;
DROP TABLE IF EXISTS public.health_connections;

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload schema';
