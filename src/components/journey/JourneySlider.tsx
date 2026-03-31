'use client'

import { cn } from '@/lib/utils'

type JourneySliderProps = {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  unit?: string
  minLabel?: string
  maxLabel?: string
  onChange: (value: number) => void
}

export function JourneySlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  minLabel,
  maxLabel,
  onChange,
}: JourneySliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white/85">{label}</p>
        <p className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-bold">
          {value}
          {unit}
        </p>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn(
          'h-2 w-full cursor-pointer appearance-none rounded-full bg-white/20',
          '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_4px_16px_rgba(255,255,255,0.35)]'
        )}
      />
      <div className="flex items-center justify-between text-xs text-white/45">
        <span>{minLabel ?? min}</span>
        <span>{maxLabel ?? max}</span>
      </div>
    </div>
  )
}
