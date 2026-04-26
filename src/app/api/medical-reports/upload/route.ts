import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { isAiEnabled } from '@/lib/env'
import { analyseMedicalReport } from '@/lib/ai-coach/medical-report'
import { buildAiCoachContext, formatContextForPrompt } from '@/lib/ai-coach/context-builder'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024 // 8 MB

const ACCEPTED_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'application/octet-stream',
])

const REPORT_TYPE_KEYWORDS: Array<{ id: string; keywords: string[] }> = [
  { id: 'blood_panel', keywords: ['blood', 'cbc', 'haemoglobin', 'hemoglobin', 'ferritin', 'vitamin', 'lipid'] },
  { id: 'imaging_xray', keywords: ['x-ray', 'xray', 'radiograph'] },
  { id: 'imaging_mri', keywords: ['mri', 'magnetic resonance'] },
  { id: 'imaging_ct', keywords: ['ct scan', 'computed tomography'] },
  { id: 'imaging_ultrasound', keywords: ['ultrasound', 'sonography'] },
  { id: 'cardiology_ecg', keywords: ['ecg', 'electrocardiogram', 'ekg'] },
  { id: 'cardiology_echo', keywords: ['echocardiogram', 'echo report'] },
  { id: 'physio_assessment', keywords: ['physiotherapy', 'physical therapy', 'gait analysis'] },
  { id: 'orthopedist_note', keywords: ['orthopaedic', 'orthopedic', 'joint exam'] },
  { id: 'allergy_panel', keywords: ['allergy', 'ige', 'immunoglobulin'] },
]

async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'text/plain' || mimeType === 'application/octet-stream') {
    try {
      return buffer.toString('utf-8')
    } catch {
      return ''
    }
  }
  if (mimeType === 'application/pdf') {
    try {
      const { default: pdfParse } = await import('pdf-parse')
      const result = await pdfParse(buffer)
      return result.text ?? ''
    } catch (error) {
      console.warn('[medical-reports] pdf-parse failed', error)
      return ''
    }
  }
  return ''
}

function inferReportType(text: string): string {
  const lower = text.toLowerCase()
  for (const candidate of REPORT_TYPE_KEYWORDS) {
    if (candidate.keywords.some((keyword) => lower.includes(keyword))) {
      return candidate.id
    }
  }
  return 'general'
}

export async function POST(request: Request) {
  if (!isAiEnabled()) {
    return NextResponse.json(
      { error: 'ai_disabled', reason: 'ANTHROPIC_API_KEY is not configured.' },
      { status: 503 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'invalid_form_data' }, { status: 400 })
  }

  const fileEntry = formData.get('file')
  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: 'missing_file' }, { status: 400 })
  }

  if (!ACCEPTED_TYPES.has(fileEntry.type) && !fileEntry.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json(
      { error: 'unsupported_type', detail: `Only PDF or plain-text reports are supported. Got ${fileEntry.type}` },
      { status: 415 }
    )
  }

  if (fileEntry.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'file_too_large', detail: 'Reports must be 8 MB or smaller.' },
      { status: 413 }
    )
  }

  const titleEntry = formData.get('title')
  const explicitTypeEntry = formData.get('report_type')

  const arrayBuffer = await fileEntry.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const rawText = await extractTextFromBuffer(buffer, fileEntry.type || 'application/pdf')

  const inferredType = typeof explicitTypeEntry === 'string' && explicitTypeEntry.trim().length > 0
    ? explicitTypeEntry.trim()
    : inferReportType(rawText)
  const title =
    typeof titleEntry === 'string' && titleEntry.trim().length > 0
      ? titleEntry.trim().slice(0, 80)
      : (fileEntry.name.replace(/\.[^.]+$/, '') || 'Medical report').slice(0, 80)

  // Insert provisional row immediately so the user can see "analysing" state.
  const { data: inserted, error: insertError } = await supabase
    .from('medical_reports')
    .insert({
      user_id: user.id,
      title,
      report_type: inferredType,
      source: 'upload',
      file_name: fileEntry.name,
      file_size_bytes: fileEntry.size,
      mime_type: fileEntry.type || 'application/pdf',
      raw_text: rawText.slice(0, 60000),
    })
    .select('id, title, report_type')
    .single()

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: 'persist_failed', detail: insertError?.message ?? 'Could not save report row.' },
      { status: 500 }
    )
  }

  // Run AI analysis. If it fails we still return the row so the user can retry.
  try {
    const userContext = await buildAiCoachContext(supabase, user.id)
    const contextBlock = formatContextForPrompt(userContext)
    const analysis = await analyseMedicalReport({
      reportTitle: title,
      reportType: inferredType,
      rawText,
      userContextBlock: contextBlock,
    })

    await supabase
      .from('medical_reports')
      .update({
        ai_summary: analysis.summary,
        ai_layman_explanation: analysis.layman_explanation,
        ai_red_flags: analysis.red_flags,
        ai_action_items: analysis.action_items,
        ai_model: analysis.rawModel,
        ai_confidence: analysis.confidence,
        analysed_at: new Date().toISOString(),
      })
      .eq('id', inserted.id)
      .eq('user_id', user.id)

    return NextResponse.json({
      ok: true,
      report: {
        id: inserted.id,
        title,
        report_type: inferredType,
        summary: analysis.summary,
        layman_explanation: analysis.layman_explanation,
        red_flags: analysis.red_flags,
        action_items: analysis.action_items,
        confidence: analysis.confidence,
      },
    })
  } catch (error) {
    console.warn('[medical-reports] analysis failed', error)
    return NextResponse.json({
      ok: true,
      report: {
        id: inserted.id,
        title,
        report_type: inferredType,
        summary: null,
        layman_explanation:
          'The AI analysis failed. Open the report from the chat sidebar and ask the AI to retry.',
      },
    })
  }
}
