-- ========================================================
-- COMPREHENSIVE CONNECTION & SECURITY ENHANCEMENTS
-- ========================================================
-- This migration addresses multiple gaps identified during 
-- connection loop testing:
-- 1. Reciprocal profile visibility (Athlete <-> Coach)
-- 2. Social search capability (Coach finding Athletes)
-- 3. Enforcement of 'Active' status for team visibility
-- 4. Prevention of dashboard crashes due to multi-team state

-- 1. [FIX] RECIPROCAL PROFILE VISIBILITY
-- Allow athletes to see their coach's profile
CREATE POLICY "Athletes can view their coach's profile" ON public.profiles
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.team_members tm
        JOIN public.teams t ON tm.team_id = t.id
        WHERE tm.athlete_id = auth.uid() 
        AND t.coach_id = public.profiles.id
        AND tm.status = 'Active'
    )
);

-- Ensure coaches can see their athletes (Robust version)
DROP POLICY IF EXISTS "Coaches can view team members profiles" ON public.profiles;
CREATE POLICY "Coaches can view team members profiles" ON public.profiles
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.teams t 
        JOIN public.team_members tm ON t.id = tm.team_id 
        WHERE t.coach_id = auth.uid() 
        AND tm.athlete_id = public.profiles.id
        AND tm.status = 'Active'
    )
);

-- 2. [NEW] SOCIAL SEARCH POLICY
-- Allow authenticated users to see basic metadata of others for search/joining
CREATE POLICY "Users can search other profiles" ON public.profiles
FOR SELECT USING (
    auth.role() = 'authenticated'
) 
-- Note: In a real production app, you might restrict columns in the actual view
-- but for RLS, we allow the select.
;

-- 3. [FIX] ENFORCE ACTIVE STATUS IN HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_athlete_of_team(target_team_id uuid) 
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = target_team_id 
    AND athlete_id = auth.uid()
    AND status = 'Active'
  );
$$;

-- 4. [FIX] MULTI-TEAM CONFLICT PREVENTION
-- Trigger to ensure only one 'Active' membership exists for an athlete.
-- This prevents dashboard crashes when athletes join multiple squads.
CREATE OR REPLACE FUNCTION public.ensure_single_active_membership()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Active' THEN
        -- Archive all other active memberships for this athlete
        UPDATE public.team_members
        SET status = 'Archived'
        WHERE athlete_id = NEW.athlete_id
        AND id != NEW.id
        AND status = 'Active';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_single_active_membership ON public.team_members;
CREATE TRIGGER tr_single_active_membership
BEFORE INSERT OR UPDATE ON public.team_members
FOR EACH ROW EXECUTE PROCEDURE public.ensure_single_active_membership();

-- 5. REFRESH SCHEMA
NOTIFY pgrst, 'reload schema';
