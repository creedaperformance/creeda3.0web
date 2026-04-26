'use client'

import { useEffect, useState, useTransition } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'

interface ReminderToggleProps {
  initiallyActive: boolean
  vapidPublicKey: string | null
}

type Status = 'idle' | 'enabling' | 'disabling' | 'enabled' | 'disabled' | 'unsupported' | 'denied' | 'error'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

export function ReminderToggle({ initiallyActive, vapidPublicKey }: ReminderToggleProps) {
  const [status, setStatus] = useState<Status>(initiallyActive ? 'enabled' : 'idle')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const supported =
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (!supported) setStatus('unsupported')
  }, [])

  if (!vapidPublicKey) return null

  const enable = async () => {
    setError(null)
    setStatus('enabling')
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('unsupported')
        return
      }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'idle')
        return
      }
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
      const json = subscription.toJSON()
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
          },
          reminder_kind: 'daily_ritual',
          reminder_local_hour: 7,
          reminder_timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
          user_agent: navigator.userAgent.slice(0, 280),
        }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? `Server returned ${response.status}`)
      }
      setStatus('enabled')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enable reminders.')
      setStatus('error')
    }
  }

  const disable = async () => {
    setError(null)
    setStatus('disabling')
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      const endpoint = subscription?.endpoint
      if (subscription) await subscription.unsubscribe().catch(() => undefined)
      if (endpoint) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        })
      }
      setStatus('disabled')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not turn reminders off.')
      setStatus('error')
    }
  }

  const isOn = status === 'enabled'
  const isBusy = status === 'enabling' || status === 'disabling' || isPending
  const labelText = (() => {
    if (status === 'unsupported') return 'Reminders not supported on this browser'
    if (status === 'denied') return 'Notifications are blocked in browser settings'
    if (isOn) return 'Daily reminder is on · 7am local'
    return 'Get a daily reminder · 7am local'
  })()

  const onClick = () => {
    if (isBusy || status === 'unsupported' || status === 'denied') return
    startTransition(() => {
      void (isOn ? disable() : enable())
    })
  }

  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <span
        className={
          isOn
            ? 'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-300/15 text-emerald-300'
            : 'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-white/55'
        }
      >
        {isBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isOn ? (
          <Bell className="h-4 w-4" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-white">{labelText}</p>
        {error ? (
          <p className="mt-0.5 text-[11px] leading-relaxed text-rose-300">{error}</p>
        ) : (
          <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">
            One push per day from your phone or laptop. Disable any time.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={isBusy || status === 'unsupported' || status === 'denied'}
        className={
          status === 'unsupported' || status === 'denied'
            ? 'inline-flex h-9 items-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/40 cursor-not-allowed'
            : isOn
              ? 'inline-flex h-9 items-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/[0.08]'
              : 'inline-flex h-9 items-center rounded-full bg-[var(--saffron,_#FF7A1A)] px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:brightness-110'
        }
        aria-pressed={isOn}
      >
        {isOn ? 'Turn off' : 'Turn on'}
      </button>
    </div>
  )
}
