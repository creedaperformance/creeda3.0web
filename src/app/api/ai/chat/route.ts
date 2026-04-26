import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { isAiEnabled } from '@/lib/env'
import { streamAiChatCompletion } from '@/lib/ai-coach/client'
import { CREEDA_AI_COACH_SYSTEM_PROMPT } from '@/lib/ai-coach/system-prompt'
import { buildAiCoachContext, formatContextForPrompt } from '@/lib/ai-coach/context-builder'
import {
  SendMessagePayloadSchema,
  ensureConversation,
  loadHistory,
  recordAssistantMessage,
  recordUserMessage,
} from '@/lib/ai-coach/conversations'
import {
  estimateCostCents,
  getQuotaSnapshot,
  quotaErrorMessage,
  recordAiUsage,
} from '@/lib/ai-coach/quotas'

export const runtime = 'nodejs'

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

  // Quota gate — block before paying for an Anthropic call.
  const quota = await getQuotaSnapshot(supabase, user.id)
  if (!quota.ok) {
    await recordAiUsage(supabase, {
      userId: user.id,
      inputTokens: 0,
      outputTokens: 0,
      costCents: 0,
      blocked: true,
    })
    return NextResponse.json(
      {
        error: 'rate_limited',
        reason: quota.reason,
        message: quotaErrorMessage(quota.reason),
        quota,
      },
      { status: 429 }
    )
  }

  const { conversation_id, topic, user_message, medical_report_id } = parsed.data

  let conversation: { id: string; topic: string; title: string }
  let history: Awaited<ReturnType<typeof loadHistory>> = []
  try {
    conversation = await ensureConversation(supabase, user.id, conversation_id, topic, user_message)
    history = conversation_id ? await loadHistory(supabase, conversation_id, user.id, 20) : []
    await recordUserMessage(supabase, {
      conversationId: conversation.id,
      userId: user.id,
      content: user_message,
      attachments: medical_report_id ? [{ type: 'medical_report', id: medical_report_id }] : [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'persist_failed', detail: (error as Error).message },
      { status: 500 }
    )
  }

  const context = await buildAiCoachContext(supabase, user.id)
  let contextBlock = formatContextForPrompt(context)

  if (medical_report_id) {
    const { data: report } = await supabase
      .from('medical_reports')
      .select('title, report_type, ai_layman_explanation, ai_summary, raw_text')
      .eq('id', medical_report_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (report) {
      const record = report as Record<string, unknown>
      contextBlock += `\n\nThe user is asking about this medical report. Reference it directly when relevant:\n\nReport: ${
        String(record.title) || 'Untitled report'
      } (${String(record.report_type) || 'general'})\n\nPlain-language summary previously generated:\n${
        String(record.ai_layman_explanation ?? record.ai_summary ?? '— summary pending —')
      }`
    }
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let fullText = ''
      let inputTokens = 0
      let outputTokens = 0
      let model = ''

      try {
        const generator = streamAiChatCompletion({
          systemPrompt: CREEDA_AI_COACH_SYSTEM_PROMPT,
          contextBlock,
          history,
          userMessage: user_message,
        })

        controller.enqueue(
          encoder.encode(
            `event: meta\ndata: ${JSON.stringify({ conversationId: conversation.id, topic: conversation.topic })}\n\n`
          )
        )

        for await (const chunk of generator) {
          if (chunk.type === 'text_delta') {
            fullText += chunk.delta
            controller.enqueue(
              encoder.encode(
                `event: token\ndata: ${JSON.stringify({ delta: chunk.delta })}\n\n`
              )
            )
          } else if (chunk.type === 'message_complete') {
            inputTokens = chunk.inputTokens
            outputTokens = chunk.outputTokens
            model = chunk.model
          }
        }

        const { costCents } = await recordAssistantMessage(supabase, {
          conversationId: conversation.id,
          userId: user.id,
          content: fullText,
          inputTokens,
          outputTokens,
          model,
        })

        await recordAiUsage(supabase, {
          userId: user.id,
          inputTokens,
          outputTokens,
          costCents,
        })

        const updatedQuota = await getQuotaSnapshot(supabase, user.id)
        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({
              ok: true,
              cost_cents: costCents,
              estimated_cost_cents: estimateCostCents(model, inputTokens, outputTokens),
              quota: updatedQuota,
            })}\n\n`
          )
        )
      } catch (error) {
        const message = (error as Error).message ?? 'Unknown error'
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
