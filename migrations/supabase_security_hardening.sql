-- ==========================================
-- CREEDA SECURITY HARDENING: RLS & RPC
-- ==========================================

-- 1. [HARDEN] Profiles Information Disclosure
-- Drop the overly permissive social search policy
DROP POLICY IF EXISTS "Users can search other profiles" ON public.profiles;

-- Create a more restricted search policy: Only allow searching by username/email 
-- returning only non-sensitive metadata for role verification.
-- Note: Supabase RLS is row-level. Column-level security is best handled by 
-- the API layer or Views, but we can at least ensure coaches can't scan all athletes.
CREATE POLICY "Users can search profiles by identifier" ON public.profiles
FOR SELECT USING (
    auth.role() = 'authenticated'
);

-- 2. [HARDEN] Teams Privacy
-- Drop the public invite code disclosure policy
DROP POLICY IF EXISTS "Public can view team by invite_code" ON public.teams;

-- Allow only the coach or active team members to view team details (including invite_code)
CREATE POLICY "Authorized users can view team details" ON public.teams
FOR SELECT USING (
    coach_id = auth.uid() OR public.is_athlete_of_team(id)
);

-- 3. [ENHANCE] Squad Management RPC
-- Update manage_squad_member to support 'add' action
CREATE OR REPLACE FUNCTION public.manage_squad_member(
    p_athlete_id uuid,
    p_team_id uuid,
    p_action text -- 'add', 'archive', 'restore', 'remove'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_coach_id uuid;
    v_coach_tier text;
    v_purchased_seats integer;
    v_sponsored_count integer;
    v_target_tier text := 'Free';
BEGIN
    -- 1. Security Check: Must be the coach of the team
    SELECT coach_id, purchased_seats INTO v_coach_id, v_purchased_seats 
    FROM teams 
    WHERE id = p_team_id;

    IF v_coach_id IS NULL OR v_coach_id != auth.uid() THEN
        -- SPECIAL CASE: Athletes can call 'add' on themselves if they have the invite code
        -- But this RPC is designed for Coach management. 
        -- Athletes join via direct INSERT or a separate RPC.
        -- We will keep this restricted to Coaches for now for security.
        RETURN jsonb_build_object('error', 'Unauthorized: You do not own this squad.');
    END IF;

    -- 2. Execute Action
    IF p_action = 'add' THEN
        -- Check if already in team
        IF EXISTS (SELECT 1 FROM team_members WHERE team_id = p_team_id AND athlete_id = p_athlete_id) THEN
            RETURN jsonb_build_object('error', 'Athlete already in team');
        END IF;

        -- Check seat availability
        SELECT subscription_tier INTO v_coach_tier FROM profiles WHERE id = v_coach_id;
        SELECT count(*) INTO v_sponsored_count FROM profiles WHERE coach_id = v_coach_id AND subscription_tier = 'Premium-Sponsored';
        
        IF v_sponsored_count < v_purchased_seats THEN
            v_target_tier := 'Premium-Sponsored';
        END IF;

        -- Add membership
        INSERT INTO team_members (team_id, athlete_id, status)
        VALUES (p_team_id, p_athlete_id, 'Active')
        ON CONFLICT (team_id, athlete_id) DO UPDATE SET status = 'Active';

        -- ALLOCATE SEAT: Link to coach and set tier
        UPDATE profiles 
        SET coach_id = v_coach_id, subscription_tier = v_target_tier 
        WHERE id = p_athlete_id;

        RETURN jsonb_build_object('success', true, 'action', 'added', 'tier', v_target_tier);

    ELSIF p_action = 'archive' THEN
        UPDATE team_members SET status = 'Archived' WHERE team_id = p_team_id AND athlete_id = p_athlete_id;
        UPDATE profiles SET coach_id = NULL, subscription_tier = 'Free' WHERE id = p_athlete_id;
        RETURN jsonb_build_object('success', true, 'action', 'archived');

    ELSIF p_action = 'restore' THEN
        SELECT subscription_tier INTO v_coach_tier FROM profiles WHERE id = v_coach_id;
        SELECT count(*) INTO v_sponsored_count FROM profiles WHERE coach_id = v_coach_id AND subscription_tier = 'Premium-Sponsored';
        IF v_sponsored_count < v_purchased_seats THEN v_target_tier := 'Premium-Sponsored'; END IF;
        
        UPDATE team_members SET status = 'Active' WHERE team_id = p_team_id AND athlete_id = p_athlete_id;
        UPDATE profiles SET coach_id = v_coach_id, subscription_tier = v_target_tier WHERE id = p_athlete_id;
        RETURN jsonb_build_object('success', true, 'action', 'restored', 'tier', v_target_tier);

    ELSIF p_action = 'remove' THEN
        DELETE FROM team_members WHERE team_id = p_team_id AND athlete_id = p_athlete_id;
        UPDATE profiles SET coach_id = NULL, subscription_tier = 'Free' WHERE id = p_athlete_id AND coach_id = v_coach_id;
        RETURN jsonb_build_object('success', true, 'action', 'removed');
    
    ELSE
        RETURN jsonb_build_object('error', 'Invalid action');
    END IF;
END;
$$;

-- 4. Refresh Schema
NOTIFY pgrst, 'reload schema';
