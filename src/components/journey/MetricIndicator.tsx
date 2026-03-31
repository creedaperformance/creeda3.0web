'use client'

import { cn } from '@/lib/utils'

function getTone(value: number) {
  if (value >= 70) return 'good'
  if (value >= 45) return 'warn'
  return 'risk'
}

export function MetricIndicator({
  label,
  value,
}: {
  label: string
  value: number
}) {
  const tone = getTone(value)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-white/55">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        <div
          className={cn(
            'h-3 w-3 rounded-full',
            tone === 'good' && 'bg-[#22C55E]',
            tone === 'warn' && 'bg-[#F59E0B]',
            tone === 'risk' && 'bg-[#EF4444]'
          )}
        />
        <p className="text-2xl font-black">{value}%</p>
      </div>
    </div>
  )
}
