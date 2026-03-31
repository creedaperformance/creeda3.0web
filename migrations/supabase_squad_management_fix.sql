-- ==========================================
-- SQUAD MANAGEMENT & SEAT RECLAMATION FIX
-- ==========================================
-- This script adds a secure RPC to handle athlete archiving/removal 
-- while bypassing RLS for profile updates.

-- 1. Create the secure management function
CREATE OR REPLACE FUNCTION public.manage_squad_member(
    p_athlete_id uuid,
    p_team_id uuid,
    p_action text -- 'archive', 'restore', 'remove'
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
    v_new_coach_id uuid := NULL;
BEGIN
    -- 1. Security Check: Must be the coach of the team
    SELECT coach_id, purchased_seats INTO v_coach_id, v_purchased_seats 
    FROM teams 
    WHERE id = p_team_id;

    IF v_coach_id IS NULL OR v_coach_id != auth.uid() THEN
        RETURN jsonb_build_object('error', 'Unauthorized: You do not own this squad.');
    END IF;

    -- 2. Execute Action
    IF p_action = 'archive' THEN
        -- Mark membership as archived
        UPDATE team_members 
        SET status = 'Archived' 
        WHERE team_id = p_team_id AND athlete_id = p_athlete_id;
        
        -- RECLAIM SEAT: Downgrade athlete profile and remove coach link
        UPDATE profiles 
        SET coach_id = NULL, subscription_tier = 'Free' 
        WHERE id = p_athlete_id;
        
        RETURN jsonb_build_object('success', true, 'action', 'archived');

    ELSIF p_action = 'restore' THEN
        -- Get Coach's current plan capacity
        SELECT subscription_tier INTO v_coach_tier FROM profiles WHERE id = v_coach_id;
        
        -- Check seat availability
        SELECT count(*) INTO v_sponsored_count 
        FROM profiles 
        WHERE coach_id = v_coach_id AND subscription_tier = 'Premium-Sponsored';
        
        IF v_sponsored_count < v_purchased_seats THEN
            v_target_tier := 'Premium-Sponsored';
        END IF;

        -- Mark membership as active
        UPDATE team_members 
        SET status = 'Active' 
        WHERE team_id = p_team_id AND athlete_id = p_athlete_id;
        
        -- ALLOCATE SEAT: Link to coach and set tier
        UPDATE profiles 
        SET coach_id = v_coach_id, subscription_tier = v_target_tier 
        WHERE id = p_athlete_id;
        
        RETURN jsonb_build_object('success', true, 'action', 'restored', 'tier', v_target_tier);

    ELSIF p_action = 'remove' THEN
        -- DELETE membership entirely
        DELETE FROM team_members 
        WHERE team_id = p_team_id AND athlete_id = p_athlete_id;
        
        -- RECLAIM SEAT: Ensure athlete is detached
        UPDATE profiles 
        SET coach_id = NULL, subscription_tier = 'Free' 
        WHERE id = p_athlete_id AND coach_id = v_coach_id;
        
        RETURN jsonb_build_object('success', true, 'action', 'removed');
    
    ELSE
        RETURN jsonb_build_object('error', 'Invalid action');
    END IF;
END;
$$;

-- 2. Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
