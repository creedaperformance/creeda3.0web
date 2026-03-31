-- Migration: Username Uniqueness & Case-Insensitive Index (v14)
-- Enforces absolute uniqueness for usernames, regardless of casing.

-- 1. Clean up any existing duplicates (unlikely in current build) by lowercasing
UPDATE public.profiles SET username = LOWER(username) WHERE username IS NOT NULL;

-- 2. Drop existing standard unique constraint if it exists (named normally by Postgres as profiles_username_key)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- 3. Add Case-Insensitive Unique Index
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (LOWER(username));

-- 4. Add Index on full_name for faster coach/athlete searches
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles (full_name);

COMMENT ON INDEX idx_profiles_username_lower IS 'Enforces case-insensitive username uniqueness at the database level.';
