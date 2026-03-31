-- Add Video Analysis Reports Table
CREATE TABLE IF NOT EXISTS public.video_analysis_reports (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    sport character varying NOT NULL,
    frame_count integer NOT NULL,
    warnings integer NOT NULL,
    positive integer NOT NULL,
    issues_detected text[] DEFAULT '{}'::text[],
    feedback_log jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.video_analysis_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own video analysis reports" ON public.video_analysis_reports;
CREATE POLICY "Users can view their own video analysis reports"
    ON public.video_analysis_reports FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own video analysis reports" ON public.video_analysis_reports;
CREATE POLICY "Users can insert their own video analysis reports"
    ON public.video_analysis_reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);
