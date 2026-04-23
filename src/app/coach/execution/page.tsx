import { redirect } from 'next/navigation'

import { verifyRole } from '@/lib/auth_utils'
import { createClient } from '@/lib/supabase/server'
import { listCoachExecutionBoard } from '@/lib/product/server'
import { CoachExecutionBoard } from '@/app/coach/execution/components/CoachExecutionBoard'

export const dynamic = 'force-dynamic'

export default async function CoachExecutionPage() {
  const { user } = await verifyRole('coach')
  const supabase = await createClient()
  const board = await listCoachExecutionBoard(supabase, user.id)

  if (!user) redirect('/login')

  return <CoachExecutionBoard initialBoard={board} />
}
