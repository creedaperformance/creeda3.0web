-- ==========================================
-- UNIFIED CONNECTION & SEAT INTEGRITY FIX
-- ==========================================
-- This script expands the manage_squad_member RPC to handle
-- atomic adding of athletes (manual or via code) with seat checks.

CREATE OR REPLACE FUNCTION public.manage_squad_member(
    p_athlete_id uuid,
    p_team_id uuid,
    p_action text -- 'archive', 'restore', 'remove', 'add'
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
    v_seat_limit integer;
BEGIN
    -- 1. Identity & Auth Check
    SELECT coach_id, purchased_seats INTO v_coach_id, v_purchased_seats FROM teams WHERE id = p_team_id;
    
    -- For 'add', we allow both coach (manual add) and athlete (join via code)
    IF p_action = 'add' THEN
        IF auth.uid() != v_coach_id AND auth.uid() != p_athlete_id THEN
            RETURN jsonb_build_object('error', 'Unauthorized');
        END IF;
    ELSIF v_coach_id IS NULL OR v_coach_id != auth.uid() THEN
        RETURN jsonb_build_object('error', 'Unauthorized');
    END IF;

    -- 2. Execute Action
    IF p_action = 'archive' THEN
        UPDATE team_members SET status = 'Archived' WHERE team_id = p_team_id AND athlete_id = p_athlete_id;
        UPDATE profiles SET coach_id = NULL, subscription_tier = 'Free' WHERE id = p_athlete_id;
        RETURN jsonb_build_object('success', true);

    ELSIF p_action = 'restore' OR p_action = 'add' THEN
        -- Seat Logic
        SELECT count(*) INTO v_sponsored_count FROM profiles WHERE coach_id = v_coach_id AND subscription_tier = 'Premium-Sponsored';
        
        -- Determine seat limit based on coach profile
        SELECT subscription_tier INTO v_coach_tier FROM profiles WHERE id = v_coach_id;
        v_seat_limit := COALESCE(v_purchased_seats, CASE WHEN v_coach_tier = 'Coach-Pro-Plus' THEN 35 ELSE 15 END);

        IF v_sponsored_count < v_seat_limit THEN 
            v_target_tier := 'Premium-Sponsored'; 
        END IF;

        IF p_action = 'add' THEN
            INSERT INTO team_members (team_id, athlete_id, status)
            VALUES (p_team_id, p_athlete_id, 'Active')
            ON CONFLICT (team_id, athlete_id) DO UPDATE SET status = 'Active';
        ELSE
            UPDATE team_members SET status = 'Active' WHERE team_id = p_team_id AND athlete_id = p_athlete_id;
        END IF;

        UPDATE profiles 
        SET coach_id = v_coach_id, 
            subscription_tier = v_target_tier 
        WHERE id = p_athlete_id;

        RETURN jsonb_build_object('success', true, 'tier_assigned', v_target_tier);

    ELSIF p_action = 'remove' THEN
        DELETE FROM team_members WHERE team_id = p_team_id AND athlete_id = p_athlete_id;
        UPDATE profiles SET coach_id = NULL, subscription_tier = 'Free' WHERE id = p_athlete_id AND coach_id = v_coach_id;
        RETURN jsonb_build_object('success', true);

    ELSE
        RETURN jsonb_build_object('error', 'Invalid action');
    END IF;
END;
$$;
