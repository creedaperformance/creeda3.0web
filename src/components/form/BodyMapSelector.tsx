'use client'

import type { FormOption } from '@/forms/types'

interface BodyMapSelectorProps {
  options: FormOption[]
  value: string[]
  onChange: (value: string[]) => void
  maxSelections?: number
}

export function BodyMapSelector({
  options,
  value,
  onChange,
  maxSelections = 2,
}: BodyMapSelectorProps) {
  function toggle(nextValue: string) {
    const exists = value.includes(nextValue)

    if (exists) {
      onChange(value.filter((item) => item !== nextValue))
      return
    }

    if (value.length >= maxSelections) {
      onChange([...value.slice(1), nextValue])
      return
    }

    onChange([...value, nextValue])
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.03] p-4">
        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/45">
          Pick up to {maxSelections} areas
        </div>
        <div className="grid grid-cols-2 gap-3">
          {options.map((option) => {
            const active = value.includes(String(option.value))

            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => toggle(String(option.value))}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  active
                    ? 'border-[#fbbf24] bg-[#fbbf24]/12 text-white'
                    : 'border-white/12 bg-white/4 text-white/75 hover:border-white/22'
                }`}
              >
                <div className="text-sm font-bold">{option.label}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
