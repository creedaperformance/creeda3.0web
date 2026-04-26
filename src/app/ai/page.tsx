import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { isAiEnabled } from '@/lib/env'
import { AiCoachClient } from './AiCoachClient'

export const dynamic = 'force-dynamic'

type ConversationRow = {
  id: string
  title: string
  topic: string
  last_message_at: string
}

type ReportRow = {
  id: string
  title: string
  report_type: string
  ai_layman_explanation: string | null
  uploaded_at: string
}

export default async function AiCoachPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const aiEnabled = isAiEnabled()

  const [{ data: conversationsData }, { data: reportsData }] = await Promise.all([
    supabase
      .from('ai_conversations')
      .select('id, title, topic, last_message_at')
      .eq('user_id', user.id)
      .eq('archived', false)
      .order('last_message_at', { ascending: false })
      .limit(15),
    supabase
      .from('medical_reports')
      .select('id, title, report_type, ai_layman_explanation, uploaded_at')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })
      .limit(10),
  ])

  const conversations = (conversationsData ?? []) as unknown as ConversationRow[]
  const medicalReports = (reportsData ?? []) as unknown as ReportRow[]

  return (
    <AiCoachClient
      aiEnabled={aiEnabled}
      conversations={conversations.map((c) => ({
        id: c.id,
        title: c.title,
        topic: c.topic,
        lastMessageAt: c.last_message_at,
      }))}
      medicalReports={medicalReports.map((r) => ({
        id: r.id,
        title: r.title,
        reportType: r.report_type,
        summary: r.ai_layman_explanation ?? null,
        uploadedAt: r.uploaded_at,
      }))}
    />
  )
}
