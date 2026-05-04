'use client'

import Link from 'next/link'
import { useState, useSyncExternalStore } from 'react'

import { Button } from '@/components/ui/button'
import {
  getCookieChoiceServerSnapshot,
  getCookieChoiceSnapshot,
  persistCookieChoice,
  subscribeToCookieChoice,
} from '@/lib/cookie-consent'

export function CookieNotice() {
  const [dismissed, setDismissed] = useState(false)
  const storedChoice = useSyncExternalStore(
    subscribeToCookieChoice,
    getCookieChoiceSnapshot,
    getCookieChoiceServerSnapshot
  )

  if (dismissed || storedChoice) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[120] sm:bottom-4 sm:left-4 sm:right-4">
      <div className="mx-auto max-w-5xl rounded-t-2xl sm:rounded-2xl border-t sm:border border-white/15 bg-[#0a111f]/95 p-4 sm:p-5 backdrop-blur-xl shadow-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">Cookie Notice</p>
        <p className="mt-2 text-sm text-white/80 leading-relaxed">
          CREEDA uses essential cookies for login and core security. Optional analytics cookies only run after you
          choose <span className="font-semibold text-white">Accept all</span>. Read our{' '}
          <Link href="/cookies" className="underline underline-offset-4 text-primary hover:text-primary/80">
            Cookie Policy
          </Link>.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              persistCookieChoice('accepted_all')
              setDismissed(true)
            }}
            className="h-9 rounded-xl bg-primary text-black font-bold text-xs"
          >
            Accept all
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              persistCookieChoice('essential_only')
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
