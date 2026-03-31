-- Remove squad access gating from the live RPC layer.
-- The legacy subscription_tier column is preserved for compatibility,
-- but it no longer controls coach-athlete access.

CREATE OR REPLACE FUNCTION public.manage_squad_member(
    p_athlete_id uuid,
    p_team_id uuid,
    p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_coach_id uuid;
BEGIN
    SELECT coach_id
    INTO v_coach_id
    FROM teams
    WHERE id = p_team_id;

    IF v_coach_id IS NULL OR v_coach_id != auth.uid() THEN
        RETURN jsonb_build_object('error', 'Unauthorized: You do not own this squad.');
    END IF;

    IF p_action = 'add' THEN
        IF EXISTS (
            SELECT 1
            FROM team_members
            WHERE team_id = p_team_id AND athlete_id = p_athlete_id
        ) THEN
            RETURN jsonb_build_object('error', 'Athlete already in team');
        END IF;

        INSERT INTO team_members (team_id, athlete_id, status)
        VALUES (p_team_id, p_athlete_id, 'Active')
        ON CONFLICT (team_id, athlete_id) DO UPDATE SET status = 'Active';

        UPDATE profiles
        SET coach_id = v_coach_id
        WHERE id = p_athlete_id;

        RETURN jsonb_build_object('success', true, 'action', 'added');
    ELSIF p_action = 'archive' THEN
        UPDATE team_members
        SET status = 'Archived'
        WHERE team_id = p_team_id AND athlete_id = p_athlete_id;

        RETURN jsonb_build_object('success', true, 'action', 'archived');
    ELSIF p_action = 'restore' THEN
        UPDATE team_members
        SET status = 'Active'
        WHERE team_id = p_team_id AND athlete_id = p_athlete_id;

        UPDATE profiles
        SET coach_id = v_coach_id
        WHERE id = p_athlete_id;

        RETURN jsonb_build_object('success', true, 'action', 'restored');
    ELSIF p_action = 'remove' THEN
        DELETE FROM team_members
        WHERE team_id = p_team_id AND athlete_id = p_athlete_id;

        UPDATE profiles
        SET coach_id = NULL
        WHERE id = p_athlete_id AND coach_id = v_coach_id;

        RETURN jsonb_build_object('success', true, 'action', 'removed');
    ELSE
        RETURN jsonb_build_object('error', 'Invalid action');
    END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
