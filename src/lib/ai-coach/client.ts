import 'server-only'

import Anthropic from '@anthropic-ai/sdk'

import { getAnthropicConfig } from '@/lib/env'

let cachedClient: Anthropic | null = null

export function getAnthropicClient(): Anthropic | null {
  const config = getAnthropicConfig()
  if (!config) return null
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: config.apiKey })
  }
  return cachedClient
}

export type AiChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AiChatResult = {
  content: string
  inputTokens: number
  outputTokens: number
  model: string
}

/**
 * Non-streaming completion. Used by:
 * - Medical-report explanation pipeline (one-shot summarisation)
 * - Tests / fallback when streaming isn't possible
 */
export async function runAiChatCompletion(args: {
  systemPrompt: string
  contextBlock: string
  history: AiChatMessage[]
  userMessage: string
}): Promise<AiChatResult> {
  const config = getAnthropicConfig()
  const client = getAnthropicClient()
  if (!client || !config) {
    throw new Error('Anthropic API key is not configured.')
  }

  const messages: AiChatMessage[] = [
    ...args.history,
    { role: 'user' as const, content: args.userMessage },
  ]

  const response = await client.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    system: [
      { type: 'text' as const, text: args.systemPrompt },
      { type: 'text' as const, text: args.contextBlock },
    ],
    messages,
  })

  const content = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

  return {
    content,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model: response.model,
  }
}

/**
 * Streaming completion. Returns an async iterable of text deltas. Consumed by
 * the chat API route which pipes them through Server-Sent Events to the
 * browser.
 */
export async function* streamAiChatCompletion(args: {
  systemPrompt: string
  contextBlock: string
  history: AiChatMessage[]
  userMessage: string
}): AsyncGenerator<
  | { type: 'text_delta'; delta: string }
  | { type: 'message_complete'; inputTokens: number; outputTokens: number; model: string },
  void,
  void
> {
  const config = getAnthropicConfig()
  const client = getAnthropicClient()
  if (!client || !config) {
    throw new Error('Anthropic API key is not configured.')
  }

  const messages: AiChatMessage[] = [
    ...args.history,
    { role: 'user' as const, content: args.userMessage },
  ]

  const stream = client.messages.stream({
    model: config.model,
    max_tokens: config.maxTokens,
    system: [
      { type: 'text' as const, text: args.systemPrompt },
      { type: 'text' as const, text: args.contextBlock },
    ],
    messages,
  })

  let inputTokens = 0
  let outputTokens = 0
  let model = config.model

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield { type: 'text_delta', delta: event.delta.text }
    } else if (event.type === 'message_start') {
      inputTokens = event.message.usage?.input_tokens ?? 0
      outputTokens = event.message.usage?.output_tokens ?? 0
      model = event.message.model
    } else if (event.type === 'message_delta') {
      outputTokens = event.usage?.output_tokens ?? outputTokens
    }
  }

  yield { type: 'message_complete', inputTokens, outputTokens, model }
}
