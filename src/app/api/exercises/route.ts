import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { queryExercises } from '@/lib/product/recommendation-engine'
import type { ExerciseCategory, SessionBlockType, SupportedSport } from '@/lib/product/types'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get('limit') || 40))
  )

  const exercises = queryExercises({
    category: (searchParams.get('category') || undefined) as ExerciseCategory | undefined,
    sport: (searchParams.get('sport') || undefined) as SupportedSport | undefined,
    equipment: searchParams.get('equipment') || undefined,
    goal: searchParams.get('goal') || undefined,
    search: searchParams.get('search') || undefined,
    blockType: (searchParams.get('blockType') || undefined) as SessionBlockType | undefined,
  }).slice(0, limit)

  return NextResponse.json({
    count: exercises.length,
    exercises,
  })
}
