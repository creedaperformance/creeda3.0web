'use client'

import type { ReactNode } from 'react'

export function JourneyShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050912] text-white">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#2DD4BF]/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#22C55E]/10 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(255,255,255,0.06),transparent_35%),radial-gradient(circle_at_90%_90%,rgba(255,255,255,0.04),transparent_35%)]" />
      <div className="relative z-10 mx-auto w-full max-w-xl px-5 pb-24 pt-8">{children}</div>
    </div>
  )
}
