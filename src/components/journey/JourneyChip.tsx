'use client'

import { cn } from '@/lib/utils'

export function JourneyChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-[0.98]',
        active
          ? 'border-[#22C55E]/80 bg-[#22C55E]/20 text-white'
          : 'border-white/15 bg-white/5 text-white/70 hover:border-white/35'
      )}
    >
      {label}
    </button>
  )
}
