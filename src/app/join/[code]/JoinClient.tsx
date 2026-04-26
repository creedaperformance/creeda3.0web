'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'

export function JoinClient({
  inviteCode,
  squadName,
}: {
  inviteCode: string
  squadName: string
}) {
  const router = useRouter()
  const [isJoining, setIsJoining] = useState(false)
  const [position, setPosition] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [joined, setJoined] = useState<boolean>(false)

  async function join() {
    setError(null)
    setIsJoining(true)
    try {
      const res = await fetch('/api/squads/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invite_code: inviteCode,
          position: position.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.detail ?? data?.error ?? 'Could not join squad.')
      }
      setJoined(true)
      window.setTimeout(() => router.replace('/athlete/dashboard'), 900)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsJoining(false)
    }
  }

  if (joined) {
    return (
      <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/[0.06] p-4">
        <CheckCircle2 className="h-5 w-5 text-emerald-300" />
        <p className="mt-2 text-sm font-bold text-white">You&apos;re in.</p>
        <p className="mt-1 text-[12px] leading-relaxed text-emerald-100/70">
          Welcome to <span className="font-bold">{squadName}</span>. Taking you to your dashboard.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
          Your position (optional)
        </span>
        <input
          type="text"
          value={position}
          onChange={(event) => setPosition(event.target.value.slice(0, 60))}
          placeholder="e.g. Centre-back, Pace bowler"
          className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#6ee7b7]/70"
        />
      </label>

      {error ? <p className="text-sm font-bold text-rose-300">{error}</p> : null}

      <button
        type="button"
        onClick={join}
        disabled={isJoining}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#6ee7b7] px-5 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:brightness-110 disabled:opacity-50"
      >
        {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isJoining ? 'Joining…' : `Join ${squadName}`}
      </button>
      <p className="text-[10px] leading-relaxed text-white/40">
        You can change your sharing preferences later from Settings → Squads. Coaches never see
        medical-screening or report details unless you explicitly share them.
      </p>
    </div>
  )
}
