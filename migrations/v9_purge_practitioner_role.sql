-- CREEDA V9: PURGE PRACTITIONER ROLE
-- This migration updates the role check constraint to only allow 'athlete', 'coach', and 'individual'.

-- 1. Update any existing practitioner roles to individual (safety fallback)
UPDATE public.profiles 
SET role = 'individual' 
WHERE role = 'practitioner';

-- 2. Drop the old constraint if it exists with the old list
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 3. Add the new tightened constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('athlete', 'coach', 'individual'));

-- 4. Audit any other tables (team_members, etc.)
-- Ensure no specific 'practitioner' logic remains in view definitions or functions if applicable.
