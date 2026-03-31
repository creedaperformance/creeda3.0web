'use client'

export function JourneyProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#14B8A6] to-[#22C55E] transition-all duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
