import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const { data: conversation } = await supabase
    .from('ai_conversations')
    .select('id, topic, title')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!conversation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const { data: messageRows } = await supabase
    .from('ai_messages')
    .select('role, content, created_at')
    .eq('conversation_id', id)
    .eq('user_id', user.id)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true })

  const messages = (messageRows ?? []).map((row) => {
    const record = row as { role?: string; content?: string }
    return {
      role: record.role === 'user' ? 'user' : 'assistant',
      content: typeof record.content === 'string' ? record.content : '',
    }
  })

  return NextResponse.json({
    id: conversation.id,
    topic: conversation.topic,
    title: conversation.title,
    messages,
  })
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'delete_failed', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
