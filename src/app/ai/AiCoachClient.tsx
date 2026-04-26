'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowUp,
  Brain,
  FileText,
  Loader2,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'

import { SUGGESTED_PROMPTS, type CreedaAiTopic } from '@/lib/ai-coach/system-prompt'

type Conversation = {
  id: string
  title: string
  topic: string
  lastMessageAt: string
}

type MedicalReport = {
  id: string
  title: string
  reportType: string
  summary: string | null
  uploadedAt: string
}

type StreamingMessage = {
  role: 'user' | 'assistant'
  content: string
  pending?: boolean
}

const TOPIC_CHIPS: Array<{ id: CreedaAiTopic; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'training', label: 'Training' },
  { id: 'recovery', label: 'Recovery' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'mental', label: 'Mental' },
  { id: 'injury', label: 'Injury' },
  { id: 'sport_specific', label: 'My sport' },
  { id: 'medical_report', label: 'Medical' },
  { id: 'wearable', label: 'Wearable' },
]

export function AiCoachClient({
  aiEnabled,
  conversations,
  medicalReports,
}: {
  aiEnabled: boolean
  conversations: Conversation[]
  medicalReports: MedicalReport[]
}) {
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null)
  const [topic, setTopic] = useState<CreedaAiTopic>('general')
  const [messages, setMessages] = useState<StreamingMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachedReportId, setAttachedReportId] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load history when conversation switches.
  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    let cancelled = false
    fetch(`/api/ai/conversations/${activeId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not load conversation.')
        const data = (await res.json()) as { messages: StreamingMessage[]; topic?: CreedaAiTopic }
        if (cancelled) return
        setMessages(data.messages)
        if (data.topic) setTopic(data.topic)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [activeId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const suggestedPrompts = SUGGESTED_PROMPTS[topic] ?? SUGGESTED_PROMPTS.general

  async function sendMessage(promptOverride?: string) {
    if (!aiEnabled) return
    const userMessage = (promptOverride ?? input).trim()
    if (!userMessage || isStreaming) return

    setError(null)
    setInput('')
    setIsStreaming(true)

    const optimistic: StreamingMessage[] = [
      ...messages,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '', pending: true },
    ]
    setMessages(optimistic)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeId ?? undefined,
          topic,
          user_message: userMessage,
          medical_report_id: attachedReportId ?? undefined,
        }),
      })

      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(
          typeof payload.error === 'string' ? payload.error : `Chat error (${res.status})`
        )
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let assistantText = ''
      let conversationId = activeId

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const block of events) {
          const lines = block.split('\n')
          const eventLine = lines.find((l) => l.startsWith('event:'))
          const dataLine = lines.find((l) => l.startsWith('data:'))
          if (!eventLine || !dataLine) continue
          const eventType = eventLine.slice('event:'.length).trim()
          const dataRaw = dataLine.slice('data:'.length).trim()
          let data: Record<string, unknown> = {}
          try {
            data = JSON.parse(dataRaw)
          } catch {
            continue
          }
          if (eventType === 'meta' && typeof data.conversationId === 'string') {
            conversationId = data.conversationId
            setActiveId(data.conversationId)
          } else if (eventType === 'token' && typeof data.delta === 'string') {
            assistantText += data.delta
            setMessages((prev) => {
              const next = [...prev]
              next[next.length - 1] = {
                role: 'assistant',
                content: assistantText,
                pending: true,
              }
              return next
            })
          } else if (eventType === 'error') {
            throw new Error(typeof data.error === 'string' ? data.error : 'AI streaming error')
          }
        }
      }

      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: assistantText }
        return next
      })
      if (conversationId && !activeId) setActiveId(conversationId)
    } catch (err) {
      setError((err as Error).message)
      setMessages((prev) => prev.filter((m) => !m.pending))
    } finally {
      setIsStreaming(false)
      setAttachedReportId(null)
    }
  }

  async function handleFileUpload(file: File) {
    setIsUploading(true)
    setUploadStatus(null)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Medical report')

      const res = await fetch('/api/medical-reports/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || `Upload failed (${res.status})`)
      }

      setUploadStatus(`Uploaded "${data.report.title}" — analysing now…`)
      window.setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <main className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.10),transparent_30%),linear-gradient(180deg,#020617,#08111f)] text-white">
      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside className="hidden w-72 flex-shrink-0 flex-col border-r border-white/[0.06] bg-[#070b13] lg:flex">
        <div className="border-b border-white/[0.06] p-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/45 hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" /> Back
          </Link>
          <h1 className="mt-4 flex items-center gap-2 text-xl font-black tracking-tight">
            <Brain className="h-5 w-5 text-[#6ee7b7]" />
            AI Sports Scientist
          </h1>
          <p className="mt-2 text-[11px] leading-relaxed text-white/50">
            Ask anything about your training, recovery, nutrition, sleep, or any medical report
            you upload.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveId(null)
              setMessages([])
              setError(null)
            }}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6ee7b7] px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:brightness-110"
          >
            <Sparkles className="h-3.5 w-3.5" />
            New conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {conversations.length === 0 ? (
            <p className="px-3 py-4 text-[11px] leading-relaxed text-white/40">
              Your conversations will appear here.
            </p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((conv) => {
                const active = conv.id === activeId
                return (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(conv.id)}
                      className={`flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left transition ${
                        active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <MessageSquare className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-white/45" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-bold text-white">{conv.title}</p>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                          {conv.topic}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-white/[0.06] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            Medical reports
          </p>
          <ul className="mt-2 space-y-1">
            {medicalReports.length === 0 ? (
              <li className="text-[11px] leading-relaxed text-white/35">
                Upload a blood panel or physio note and I&apos;ll explain it in plain language.
              </li>
            ) : (
              medicalReports.map((report) => (
                <li key={report.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedReportId(report.id)
                      setTopic('medical_report')
                      setInput(`Tell me what to focus on in this report.`)
                    }}
                    className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition ${
                      attachedReportId === report.id
                        ? 'bg-[#6ee7b7]/15 ring-1 ring-[#6ee7b7]/40'
                        : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <FileText className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-300" />
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-white">{report.title}</p>
                      <p className="text-[9px] uppercase tracking-[0.18em] text-white/40">
                        {report.reportType.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,text/plain"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleFileUpload(file)
              event.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!aiEnabled || isUploading}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/55 transition hover:bg-white/[0.04] disabled:opacity-40"
          >
            {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {isUploading ? 'Uploading…' : 'Upload PDF report'}
          </button>
          {uploadStatus ? (
            <p className="mt-2 text-[10px] leading-relaxed text-emerald-300">{uploadStatus}</p>
          ) : null}
        </div>
      </aside>

      {/* ── Chat surface ──────────────────────────────────────── */}
      <section className="flex flex-1 flex-col">
        {!aiEnabled ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="max-w-md rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-6">
              <ShieldAlert className="h-6 w-6 text-amber-300" />
              <h2 className="mt-3 text-xl font-black tracking-tight">AI is not configured yet.</h2>
              <p className="mt-2 text-sm leading-relaxed text-amber-100/75">
                Add your Anthropic API key in Hostinger&apos;s Node.js panel as
                <code className="mx-1 rounded bg-black/30 px-1 text-amber-200">ANTHROPIC_API_KEY</code>
                and restart the app.
              </p>
            </div>
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2 overflow-x-auto">
                {TOPIC_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setTopic(chip.id)}
                    className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] transition ${
                      topic === chip.id
                        ? 'border-[#6ee7b7]/70 bg-[#6ee7b7]/15 text-[#d1fae5]'
                        : 'border-white/10 bg-white/[0.02] text-white/55 hover:bg-white/[0.05]'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
              {messages.length === 0 ? (
                <EmptyChat
                  topic={topic}
                  prompts={suggestedPrompts}
                  onPick={(prompt) => sendMessage(prompt)}
                />
              ) : (
                <div className="mx-auto max-w-3xl space-y-5">
                  {messages.map((message, idx) => (
                    <MessageBubble key={idx} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <footer className="border-t border-white/[0.06] bg-[#070b13]/80 px-4 py-4 sm:px-8">
              <div className="mx-auto max-w-3xl">
                {attachedReportId ? (
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/[0.06] px-3 py-1 text-[11px] font-bold text-emerald-100">
                    <FileText className="h-3 w-3" />
                    Asking about a report
                    <button
                      type="button"
                      onClick={() => setAttachedReportId(null)}
                      className="text-emerald-200/55 hover:text-emerald-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}

                {error ? (
                  <p className="mb-2 text-[11px] font-bold text-rose-300">{error}</p>
                ) : null}

                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    void sendMessage()
                  }}
                  className="flex items-end gap-2"
                >
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask the AI sports scientist…"
                    rows={1}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        void sendMessage()
                      }
                    }}
                    className="min-h-[3rem] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#6ee7b7]/70"
                  />
                  <button
                    type="submit"
                    disabled={isStreaming || !input.trim()}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6ee7b7] text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                  </button>
                </form>
                <p className="mt-2 text-[10px] leading-relaxed text-white/35">
                  Educational only — never a substitute for a clinician, coach, or dietitian. Red-flag
                  symptoms? Contact a doctor or emergency services.
                </p>
              </div>
            </footer>
          </>
        )}
      </section>
    </main>
  )
}

function EmptyChat({
  topic,
  prompts,
  onPick,
}: {
  topic: CreedaAiTopic
  prompts: string[]
  onPick: (prompt: string) => void
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <Brain className="h-10 w-10 text-[#6ee7b7]" />
      <h2 className="mt-4 text-3xl font-black tracking-tight">Ask anything.</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55">
        I have access to your sport, position, readiness, weak links, and any medical report
        you&apos;ve uploaded. Pick a starter or type your own question.
      </p>
      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.22em] text-white/40">
        Suggested questions · {topic.replace(/_/g, ' ')}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPick(prompt)}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-left text-sm leading-relaxed text-white/72 transition hover:bg-white/[0.04]"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: StreamingMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={
          isUser
            ? 'max-w-[88%] rounded-2xl rounded-br-sm bg-[#6ee7b7] px-4 py-2.5 text-sm leading-relaxed text-slate-950'
            : 'max-w-[88%] rounded-2xl rounded-bl-sm bg-white/[0.04] px-4 py-2.5 text-sm leading-relaxed text-white/85'
        }
      >
        {message.content || (message.pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null)}
      </div>
    </div>
  )
}

