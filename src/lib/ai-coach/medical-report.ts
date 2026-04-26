import 'server-only'

import { runAiChatCompletion } from './client'

const MEDICAL_REPORT_SYSTEM_PROMPT = `You are the Creeda AI Sports Scientist analysing a medical report uploaded by the user. Output strict JSON in the exact shape requested.

Hard rules:
- You are not a doctor. Never diagnose. Always frame findings as "what your doctor would discuss with you."
- If you see anything that could be a clinical red flag (e.g. severely abnormal cardiac markers, suspected malignancy markers, severely abnormal blood counts, neurological warnings), call it out in the red_flags array AND end the layman_explanation with "Please share this report with your doctor or sports physician right away."
- For athletes, flag markers that affect performance (ferritin, B12, Vit-D, TSH, HbA1c, lipids, inflammatory markers) explicitly.
- Translate jargon into plain language for someone with no medical training.
- Keep summary under 60 words. Keep layman_explanation under 250 words.
- If the report appears to be unrelated, redacted, or unreadable, return red_flags: ["unreadable_report"] and explain what went wrong.

Output schema (return ONLY this JSON, nothing else):
{
  "summary": "1–2 sentence high-level summary",
  "layman_explanation": "Multi-paragraph plain-language explanation, max 250 words",
  "red_flags": ["short label", ...],
  "action_items": ["short label", ...],
  "confidence": "low | medium | high"
}`

export type MedicalReportAnalysis = {
  summary: string
  layman_explanation: string
  red_flags: string[]
  action_items: string[]
  confidence: 'low' | 'medium' | 'high'
}

const MAX_TEXT_FOR_PROMPT = 18000

export async function analyseMedicalReport(args: {
  reportTitle: string
  reportType: string
  rawText: string
  userContextBlock: string
}): Promise<MedicalReportAnalysis & { rawModel: string; inputTokens: number; outputTokens: number }> {
  const trimmedText = args.rawText.trim().slice(0, MAX_TEXT_FOR_PROMPT)

  const userMessage = [
    `Report title: ${args.reportTitle}`,
    `Report type: ${args.reportType}`,
    '',
    'Report contents (extracted text):',
    '"""',
    trimmedText.length > 0 ? trimmedText : '(empty — extraction returned no text)',
    '"""',
    '',
    'Return ONLY the JSON object described in the system prompt.',
  ].join('\n')

  const response = await runAiChatCompletion({
    systemPrompt: MEDICAL_REPORT_SYSTEM_PROMPT,
    contextBlock: args.userContextBlock,
    history: [],
    userMessage,
  })

  const parsed = parseJsonStrict(response.content)
  return {
    ...parsed,
    rawModel: response.model,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
  }
}

function parseJsonStrict(input: string): MedicalReportAnalysis {
  const jsonMatch = input.match(/\{[\s\S]*\}/)
  const raw = jsonMatch ? jsonMatch[0] : input
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {
      summary: 'AI returned an unparsable response.',
      layman_explanation:
        'We could not read the AI response cleanly. Please re-upload the report; if it persists, contact support.',
      red_flags: ['ai_parse_error'],
      action_items: ['Retry upload'],
      confidence: 'low',
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return {
      summary: 'AI returned no structured response.',
      layman_explanation: 'The AI response was empty. Please retry.',
      red_flags: ['ai_empty_response'],
      action_items: ['Retry upload'],
      confidence: 'low',
    }
  }
  const r = parsed as Record<string, unknown>
  const confidence =
    r.confidence === 'low' || r.confidence === 'medium' || r.confidence === 'high'
      ? r.confidence
      : 'medium'
  return {
    summary: typeof r.summary === 'string' ? r.summary : 'No summary available.',
    layman_explanation:
      typeof r.layman_explanation === 'string'
        ? r.layman_explanation
        : 'No detailed explanation available.',
    red_flags: Array.isArray(r.red_flags)
      ? r.red_flags.filter((v): v is string => typeof v === 'string')
      : [],
    action_items: Array.isArray(r.action_items)
      ? r.action_items.filter((v): v is string => typeof v === 'string')
      : [],
    confidence,
  }
}
