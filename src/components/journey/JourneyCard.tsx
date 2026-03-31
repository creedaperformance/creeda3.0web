'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function JourneyCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-white/10 bg-white/10 p-5 shadow-[0_16px_32px_rgba(0,0,0,0.24)] backdrop-blur-md',
        className
      )}
    >
      {children}
    </div>
  )
}
