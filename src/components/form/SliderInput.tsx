'use client'

interface SliderInputProps {
  min: number
  max: number
  step?: number
  unit?: string
  value: number
  onChange: (value: number) => void
}

export function SliderInput({ min, max, step = 1, unit, value, onChange }: SliderInputProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
        <span className="text-sm text-white/70">Selected</span>
        <span className="text-xl font-black text-white">
          {value}
          {unit ? <span className="ml-1 text-sm font-semibold text-white/65">{unit}</span> : null}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#00d4ff]"
      />
      <div className="flex items-center justify-between text-xs text-white/48">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

