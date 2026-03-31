-- ==========================================
-- FINAL INFRASTRUCTURE OPTIMIZATION (100/100)
-- ==========================================

-- 1. [RATE LIMITING]
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key text PRIMARY KEY,
    count integer DEFAULT 0,
    last_attempt timestamp with time zone DEFAULT now()
);

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key text,
    p_limit integer,
    p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Cleanup old entries in window (passive cleanup)
    DELETE FROM rate_limits WHERE last_attempt < now() - (p_window_seconds || ' seconds')::interval;

    INSERT INTO rate_limits (key, count, last_attempt)
    VALUES (p_key, 1, now())
    ON CONFLICT (key) DO UPDATE
    SET 
        count = CASE 
            WHEN rate_limits.last_attempt < now() - (p_window_seconds || ' seconds')::interval THEN 1
            ELSE rate_limits.count + 1
        END,
        last_attempt = now();

    RETURN (SELECT count <= p_limit FROM rate_limits WHERE key = p_key);
END;
$$;

-- 2. [ATOMIC JOIN] 
-- RPC to join team with locker code using ROW LOCKING
CREATE OR REPLACE FUNCTION public.join_team_with_locker_code(
    p_locker_code text,
    p_athlete_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_team_id uuid;
    v_coach_id uuid;
    v_purchased_seats integer;
    v_sponsored_count integer;
    v_target_tier text := 'Free';
BEGIN
    -- 1. Find team and LOCK THE ROW to prevent concurrent allocation race
    SELECT id, coach_id, purchased_seats 
    INTO v_team_id, v_coach_id, v_purchased_seats
    FROM teams 
    WHERE invite_code = p_locker_code
    FOR UPDATE; -- CRITICAL: Lock team row

    IF v_team_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Invalid locker code.');
    END IF;

    -- 2. Check current sponsored seat count
    SELECT count(*) INTO v_sponsored_count 
    FROM profiles 
    WHERE coach_id = v_coach_id AND subscription_tier = 'Premium-Sponsored';

    -- 3. Atomic Seat Allocation
    IF v_sponsored_count < v_purchased_seats THEN
        v_target_tier := 'Premium-Sponsored';
    ELSE
        -- No seats left, athlete joins but stays 'Free'
        v_target_tier := 'Free';
    END IF;

    -- 4. Execute Membership
    INSERT INTO team_members (team_id, athlete_id, status)
    VALUES (v_team_id, p_athlete_id, 'Active')
    ON CONFLICT (team_id, athlete_id) DO UPDATE SET status = 'Active';

    -- 5. Atomic Profile Update
    UPDATE profiles 
    SET coach_id = v_coach_id, 
        subscription_tier = v_target_tier,
        onboarding_completed = true -- Auto-complete locker-code joins
    WHERE id = p_athlete_id;

    RETURN jsonb_build_object(
        'success', true, 
        'team_id', v_team_id, 
        'tier_allocated', v_target_tier,
        'seats_remaining', (v_purchased_seats - v_sponsored_count - 1)
    );
END;
$$;
