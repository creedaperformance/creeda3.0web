'use client'

import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type JourneyButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function JourneyButton({
  children,
  className,
  variant = 'primary',
  ...props
}: JourneyButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex h-12 w-full items-center justify-center rounded-2xl px-5 text-sm font-bold tracking-wide transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' &&
          'bg-gradient-to-r from-[#22C55E] via-[#14B8A6] to-[#0EA5E9] text-white shadow-[0_12px_30px_rgba(20,184,166,0.25)]',
        variant === 'secondary' &&
          'border border-white/20 bg-white/10 text-white backdrop-blur-md',
        variant === 'ghost' && 'bg-transparent text-white/70 hover:text-white',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
