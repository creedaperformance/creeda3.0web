-- Migration: Coach Connection Requests (v13)
-- Adds a formal request-and-approval table for athletes joining squads.

CREATE TABLE IF NOT EXISTS public.connection_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(athlete_id, coach_id)
);

-- RLS Policies
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view their own requests" 
ON public.connection_requests FOR SELECT USING (auth.uid() = athlete_id);

CREATE POLICY "Coaches can view requests sent to them" 
ON public.connection_requests FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Athletes can create requests" 
ON public.connection_requests FOR INSERT WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Coaches can update requests sent to them" 
ON public.connection_requests FOR UPDATE USING (auth.uid() = coach_id);

COMMENT ON TABLE public.connection_requests IS 'Formal requests from athletes to join a coach''s squad.';

-- Function: Find Profile by Locker Code (SECURITY DEFINER)
-- Allows any authenticated user to find a coach's ID by their 6-digit code.
DROP FUNCTION IF EXISTS public.find_profile_by_locker_code(text);
CREATE OR REPLACE FUNCTION public.find_profile_by_locker_code(code text)
RETURNS SETOF public.profiles AS $$
BEGIN
    RETURN QUERY
    SELECT * 
    FROM public.profiles
    WHERE locker_code = code AND role = 'coach'
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
