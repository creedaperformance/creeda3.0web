-- CREEDA V17: Shared video-analysis schema upgrade
-- Makes video analysis usable across athlete, individual, and coach experiences.

ALTER TABLE public.video_analysis_reports
  ADD COLUMN IF NOT EXISTS sport_label text,
  ADD COLUMN IF NOT EXISTS analyzer_family text,
  ADD COLUMN IF NOT EXISTS subject_role text DEFAULT 'athlete',
  ADD COLUMN IF NOT EXISTS subject_position text,
  ADD COLUMN IF NOT EXISTS vision_faults jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS summary jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS recommendations jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_video_analysis_reports_user_created
  ON public.video_analysis_reports(user_id, created_at DESC);

DROP POLICY IF EXISTS "Coaches can view roster video analysis reports" ON public.video_analysis_reports;
CREATE POLICY "Coaches can view roster video analysis reports"
  ON public.video_analysis_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = public.video_analysis_reports.user_id
        AND tm.status = 'Active'
        AND t.coach_id = auth.uid()
    )
  );
