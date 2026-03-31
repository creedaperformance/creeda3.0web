-- FIX: Expand role and subscription_tier constraints to support all paths
-- Run this in the Supabase SQL Editor

-- 1. Drop existing role constraint (handle potential auto-generated names)
DO $$ 
BEGIN 
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    
    -- Search for any check constraints on the role column 
    IF EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE table_name = 'profiles' AND column_name = 'role') THEN
        EXECUTE (
            SELECT 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(constraint_name)
            FROM information_schema.constraint_column_usage 
            WHERE table_name = 'profiles' AND column_name = 'role'
            LIMIT 1
        );
    END IF;
EXCEPTION WHEN OTHERS THEN 
    NULL; -- Ignore if doesn't exist
END $$;

-- 2. Add the updated role constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('athlete', 'coach', 'individual'));

-- 3. Drop existing subscription_tier constraint (REMOVE GATING)
DO $$ 
BEGIN 
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
    
    IF EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE table_name = 'profiles' AND column_name = 'subscription_tier') THEN
        EXECUTE (
            SELECT 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(constraint_name)
            FROM information_schema.constraint_column_usage 
            WHERE table_name = 'profiles' AND column_name = 'subscription_tier'
            LIMIT 1
        );
    END IF;
EXCEPTION WHEN OTHERS THEN 
    NULL; 
END $$;

-- 4. No new constraint added for subscription_tier to allow maximum flexibility
-- (The default remains 'Free')

-- 5. Refresh schema
NOTIFY pgrst, 'reload schema';
