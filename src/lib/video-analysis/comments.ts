import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

export interface VideoAnalysisComment {
  id: string
  reportId: string
  coachId: string
  athleteId: string
  body: string
  createdAt: string
  athleteReadAt: string | null
  coachName: string | null
}

interface CommentRow {
  id: string
  report_id: string
  coach_id: string
  athlete_id: string
  body: string
  created_at: string
  athlete_read_at: string | null
  coach_profile?: { full_name?: string | null } | null
}

function normalize(row: CommentRow): VideoAnalysisComment {
  return {
    id: row.id,
    reportId: row.report_id,
    coachId: row.coach_id,
    athleteId: row.athlete_id,
    body: row.body,
    createdAt: row.created_at,
    athleteReadAt: row.athlete_read_at,
    coachName: row.coach_profile?.full_name ?? null,
  }
}

export async function listVideoComments(
  supabase: SupabaseClient,
  reportId: string
): Promise<VideoAnalysisComment[]> {
  const { data, error } = await supabase
    .from('video_analysis_comments')
    .select(
      `
        id,
        report_id,
        coach_id,
        athlete_id,
        body,
        created_at,
        athlete_read_at,
        coach_profile:coach_id ( full_name )
      `
    )
    .eq('report_id', reportId)
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[video-analysis/comments] listVideoComments failed', error)
    return []
  }

  return (Array.isArray(data) ? data : []).map((row) => normalize(row as unknown as CommentRow))
}

export async function postCoachVideoComment(
  supabase: SupabaseClient,
  args: {
    reportId: string
    coachId: string
    athleteId: string
    body: string
  }
): Promise<{ id: string } | { error: string }> {
  const trimmed = args.body.trim()
  if (trimmed.length < 1) return { error: 'Comment cannot be empty.' }
  if (trimmed.length > 2000) return { error: 'Comment is too long (max 2000 chars).' }

  const { data, error } = await supabase
    .from('video_analysis_comments')
    .insert({
      report_id: args.reportId,
      coach_id: args.coachId,
      athlete_id: args.athleteId,
      body: trimmed,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: error?.message || 'Could not save comment.' }
  }

  return { id: data.id }
}

export async function markCommentsReadForAthlete(
  supabase: SupabaseClient,
  args: { reportId: string; athleteId: string }
): Promise<void> {
  const { error } = await supabase
    .from('video_analysis_comments')
    .update({ athlete_read_at: new Date().toISOString() })
    .eq('report_id', args.reportId)
    .eq('athlete_id', args.athleteId)
    .is('athlete_read_at', null)

  if (error) {
    console.warn('[video-analysis/comments] markCommentsRead failed', error)
  }
}

export async function countUnreadCommentsForAthlete(
  supabase: SupabaseClient,
  athleteId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('video_analysis_comments')
    .select('id', { count: 'exact', head: true })
    .eq('athlete_id', athleteId)
    .is('athlete_read_at', null)

  if (error) {
    return 0
  }
  return count ?? 0
}
