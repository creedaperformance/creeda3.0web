-- CREEDA: Video Analysis Comments
-- Wires the coach <-> athlete feedback loop on video scan reports.
-- Coach posts a comment on a report, athlete sees it in their report view.

CREATE TABLE IF NOT EXISTS public.video_analysis_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.video_analysis_reports(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  athlete_read_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_video_analysis_comments_report
  ON public.video_analysis_comments(report_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_analysis_comments_athlete_unread
  ON public.video_analysis_comments(athlete_id) WHERE athlete_read_at IS NULL;

ALTER TABLE public.video_analysis_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coach inserts own comments" ON public.video_analysis_comments;
CREATE POLICY "Coach inserts own comments"
  ON public.video_analysis_comments
  FOR INSERT
  WITH CHECK (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.athlete_id = public.video_analysis_comments.athlete_id
        AND tm.status = 'Active'
        AND t.coach_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Coach reads own comments" ON public.video_analysis_comments;
CREATE POLICY "Coach reads own comments"
  ON public.video_analysis_comments
  FOR SELECT
  USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Athlete reads comments on own reports" ON public.video_analysis_comments;
CREATE POLICY "Athlete reads comments on own reports"
  ON public.video_analysis_comments
  FOR SELECT
  USING (athlete_id = auth.uid());

DROP POLICY IF EXISTS "Athlete marks own comments read" ON public.video_analysis_comments;
CREATE POLICY "Athlete marks own comments read"
  ON public.video_analysis_comments
  FOR UPDATE
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());
