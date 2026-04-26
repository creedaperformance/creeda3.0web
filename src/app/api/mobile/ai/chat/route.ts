import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { isAiEnabled } from '@/lib/env'
import { runAiChatCompletion } from '@/lib/ai-coach/client'
import { CREEDA_AI_COACH_SYSTEM_PROMPT } from '@/lib/ai-coach/system-prompt'
import { buildAiCoachContext, formatContextForPrompt } from '@/lib/ai-coach/context-builder'
import {
  SendMessagePayloadSchema,
  ensureConversation,
  loadHistory,
  recordAssistantMessage,
  recordUserMessage,
} from '@/lib/ai-coach/conversations'

/**
 * Non-streaming version of the chat endpoint, used by the Android app where
 * SSE handling is more brittle on RN. The web version still uses streaming.
 */
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  if (!isAiEnabled()) {
    return NextResponse.json(
      { error: 'ai_disabled', reason: 'ANTHROPIC_API_KEY is not configured.' },
      { status: 503 }
    )
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = SendMessagePayloadSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const { conversation_id, topic, user_message, medical_report_id } = parsed.data

  try {
    const conversation = await ensureConversation(
      supabase,
      user.id,
      conversation_id,
      topic,
      user_message
    )
    const history = conversation_id ? await loadHistory(supabase, conversation_id, user.id, 20) : []
    await recordUserMessage(supabase, {
      conversationId: conversation.id,
      userId: user.id,
      content: user_message,
      attachments: medical_report_id ? [{ type: 'medical_report', id: medical_report_id }] : [],
    })

    const context = await buildAiCoachContext(supabase, user.id)
    const contextBlock = formatContextForPrompt(context)

    const response = await runAiChatCompletion({
      systemPrompt: CREEDA_AI_COACH_SYSTEM_PROMPT,
      contextBlock,
      history,
      userMessage: user_message,
    })

    await recordAssistantMessage(supabase, {
      conversationId: conversation.id,
      userId: user.id,
      content: response.content,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      model: response.model,
    })

    return NextResponse.json({
      ok: true,
      conversation: {
        id: conversation.id,
        topic: conversation.topic,
        title: conversation.title,
      },
      message: {
        role: 'assistant',
        content: response.content,
      },
      tokens: {
        input: response.inputTokens,
        output: response.outputTokens,
      },
      model: response.model,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'chat_failed', detail: (error as Error).message },
      { status: 500 }
    )
  }
}
