import 'server-only'

import { z } from 'zod'

import type { AiChatMessage } from './client'

export const AI_TOPIC_VALUES = [
  'general',
  'training',
  'nutrition',
  'recovery',
  'injury',
  'sleep',
  'mental',
  'sport_specific',
  'medical_report',
  'wearable',
] as const
export type AiTopic = (typeof AI_TOPIC_VALUES)[number]

export const SendMessagePayloadSchema = z.object({
  conversation_id: z.string().uuid().optional(),
  topic: z.enum(AI_TOPIC_VALUES).default('general'),
  user_message: z.string().trim().min(1).max(4000),
  /** Optional medical-report id when the user is asking about a specific report. */
  medical_report_id: z.string().uuid().optional(),
})

export type SendMessagePayload = z.infer<typeof SendMessagePayloadSchema>

type SupabaseLike = {
  from: (table: string) => any
}

export async function ensureConversation(
  supabase: SupabaseLike,
  userId: string,
  conversationId: string | undefined,
  topic: AiTopic,
  initialPrompt: string
) {
  if (conversationId) {
    const { data: existing } = await supabase
      .from('ai_conversations')
      .select('id, topic, title')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .maybeSingle()
    if (existing) return existing as { id: string; topic: AiTopic; title: string }
  }

  const title = initialPrompt.slice(0, 80).replace(/\s+/g, ' ').trim() || 'New conversation'
  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: userId,
      topic,
      title,
      last_message_at: new Date().toISOString(),
    })
    .select('id, topic, title')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not create AI conversation row.')
  }
  return data as { id: string; topic: AiTopic; title: string }
}

export async function loadHistory(
  supabase: SupabaseLike,
  conversationId: string,
  userId: string,
  limit = 20
): Promise<AiChatMessage[]> {
  const { data } = await supabase
    .from('ai_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true })
    .limit(limit)

  if (!Array.isArray(data)) return []
  return data
    .map((row) => {
      const record = row as { role?: string; content?: string }
      const role = record.role === 'user' || record.role === 'assistant' ? record.role : null
      const content = typeof record.content === 'string' ? record.content : null
      if (!role || !content) return null
      return { role, content } as AiChatMessage
    })
    .filter((m): m is AiChatMessage => m !== null)
}

export async function recordUserMessage(
  supabase: SupabaseLike,
  args: {
    conversationId: string
    userId: string
    content: string
    attachments?: unknown[]
  }
) {
  const { error } = await supabase.from('ai_messages').insert({
    conversation_id: args.conversationId,
    user_id: args.userId,
    role: 'user',
    content: args.content,
    attachments: args.attachments ?? [],
  })
  if (error) throw new Error(error.message)
}

export async function recordAssistantMessage(
  supabase: SupabaseLike,
  args: {
    conversationId: string
    userId: string
    content: string
    inputTokens: number
    outputTokens: number
    model: string
  }
) {
  const nowIso = new Date().toISOString()
  const { error: insertError } = await supabase.from('ai_messages').insert({
    conversation_id: args.conversationId,
    user_id: args.userId,
    role: 'assistant',
    content: args.content,
    tokens_input: args.inputTokens,
    tokens_output: args.outputTokens,
    model: args.model,
  })
  if (insertError) throw new Error(insertError.message)

  await supabase
    .from('ai_conversations')
    .update({ last_message_at: nowIso })
    .eq('id', args.conversationId)
    .eq('user_id', args.userId)
}
