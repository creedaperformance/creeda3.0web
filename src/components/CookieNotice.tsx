'use client'

import Link from 'next/link'
import { useState, useSyncExternalStore } from 'react'

import { Button } from '@/components/ui/button'

const COOKIE_NOTICE_KEY = 'creeda_cookie_notice_v1'

type ConsentChoice = 'accepted_all' | 'essential_only'

function persistChoice(choice: ConsentChoice) {
  try {
    localStorage.setItem(COOKIE_NOTICE_KEY, choice)
    window.dispatchEvent(new CustomEvent('creeda:cookie-consent', { detail: { choice } }))
  } catch {
    // Ignore storage failures and keep UX resilient.
  }
}

function subscribeToCookieChoice(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {}
  const listener = () => onStoreChange()
  window.addEventListener('storage', listener)
  return () => window.removeEventListener('storage', listener)
}

function getCookieChoiceSnapshot() {
  if (typeof window === 'undefined') return 'accepted_all'
  try {
    return localStorage.getItem(COOKIE_NOTICE_KEY)
  } catch {
    return null
  }
}

export function CookieNotice() {
  const [dismissed, setDismissed] = useState(false)
  const storedChoice = useSyncExternalStore(
    subscribeToCookieChoice,
    getCookieChoiceSnapshot,
    () => 'accepted_all'
  )

  if (dismissed || storedChoice) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[120]">
      <div className="mx-auto max-w-5xl rounded-2xl border border-white/15 bg-[#0a111f]/95 p-4 sm:p-5 backdrop-blur-xl shadow-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">Cookie Notice</p>
        <p className="mt-2 text-sm text-white/80 leading-relaxed">
          CREEDA uses essential cookies for login and core security. Optional analytics cookies, if enabled in future,
          will only run with your consent. Read our <Link href="/cookies" className="underline underline-offset-4 text-primary hover:text-primary/80">Cookie Policy</Link>.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              persistChoice('accepted_all')
              setDismissed(true)
            }}
            className="h-9 rounded-xl bg-primary text-black font-bold text-xs"
          >
            Accept all
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              persistChoice('essential_only')
              setDismissed(true)
            }}
            className="h-9 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 text-xs"
          >
            Essential only
          </Button>
        </div>
      </div>
    </div>
  )
}
