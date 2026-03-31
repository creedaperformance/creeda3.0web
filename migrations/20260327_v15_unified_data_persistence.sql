-- CREEDA V15: Unified Data Persistence Stabilization
-- Synchronizes role-based access, triggers, and schema alignment for high-performance intelligence.

-- 1. UNIFY USER ROLES (Ensure all 4 pathways are authorized)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('athlete', 'coach', 'individual'));

-- 2. ENHANCE AUTH TRIGGER (Handle multi-role signups gracefully)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, avatar_url, subscription_tier)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Creeda User'), 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'athlete'),
    new.raw_user_meta_data->>'avatar_url',
    CASE 
      WHEN (new.raw_user_meta_data->>'role') = 'coach' THEN 'Coach-Pro'
      WHEN (new.raw_user_meta_data->>'role') = 'individual' THEN 'Free'
      ELSE COALESCE(new.raw_user_meta_data->>'subscription_tier', 'Free')
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. STANDARDIZE PERSISTENCE SCHEMA (Ensure diagnostics is ready for V4.2)
-- Ensure all physiological domains exist with proper defaults
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='diagnostics' AND column_name='physiology_profile') THEN
        -- Standardize default if it exists
        ALTER TABLE public.diagnostics ALTER COLUMN physiology_profile SET DEFAULT '{
            "endurance_capacity": 2,
            "strength_capacity": 2,
            "explosive_power": 2,
            "agility_control": 2,
            "reaction_self_perception": 2,
            "recovery_efficiency": 2,
            "fatigue_resistance": 2,
            "load_tolerance": 2,
            "movement_robustness": 2,
            "coordination_control": 2
        }'::jsonb;
    END IF;
END $$;

-- 4. CONSOLIDATE RLS POLICIES (Owner-Access Single Truth)

-- Diagnostics: Owner-Only
DROP POLICY IF EXISTS "Athletes can manage own diagnostics" ON public.diagnostics;
CREATE POLICY "Users can manage own diagnostics" 
    ON public.diagnostics FOR ALL 
    USING (auth.uid() = athlete_id)
    WITH CHECK (auth.uid() = athlete_id);

-- Daily Logs: Owner-Only
DROP POLICY IF EXISTS "Athletes can manage own logs" ON public.daily_load_logs;
CREATE POLICY "Users can manage own logs" 
    ON public.daily_load_logs FOR ALL 
    USING (auth.uid() = athlete_id)
    WITH CHECK (auth.uid() = athlete_id);

-- Individual Profiles: Owner-Only
DROP POLICY IF EXISTS "Individuals can manage own profile" ON public.individual_profiles;
CREATE POLICY "Users can manage own individual profile" 
    ON public.individual_profiles FOR ALL 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 5. AUXILIARY TABLES (Ensure all pathway connectors exist)

-- Connection Requests (For Athlete -> Coach linking)
CREATE TABLE IF NOT EXISTS public.connection_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(athlete_id, coach_id)
);

ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own connection requests" ON public.connection_requests;
CREATE POLICY "Users can manage own connection requests" 
    ON public.connection_requests FOR ALL 
    USING (auth.uid() = athlete_id OR auth.uid() = coach_id)
    WITH CHECK (auth.uid() = athlete_id OR auth.uid() = coach_id);

-- 6. GRANTS (Ensure authenticated users can push data)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role, authenticated;

-- Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
