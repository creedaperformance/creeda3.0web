'use client'

import type { FormOption } from '@/forms/types'

interface ChipSelectorProps {
  options: FormOption[]
  value: string | number | boolean | Array<string | number | boolean> | null | undefined
  onChange: (value: string | number | boolean | Array<string | number | boolean>) => void
  multiple?: boolean
}

export function ChipSelector({ options, value, onChange, multiple = false }: ChipSelectorProps) {
  const selectedValues = Array.isArray(value) ? value : value !== undefined && value !== null ? [value] : []

  function toggle(nextValue: string | number | boolean) {
    if (!multiple) {
      onChange(nextValue)
      return
    }

    const exists = selectedValues.includes(nextValue)
    const next = exists
      ? selectedValues.filter((item) => item !== nextValue)
      : [...selectedValues, nextValue]

    onChange(next)
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((option) => {
        const active = selectedValues.includes(option.value)

        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => toggle(option.value)}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              active
                ? 'border-[#6ee7b7] bg-[#6ee7b7]/12 text-white'
                : 'border-white/12 bg-white/4 text-white/78 hover:border-white/22 hover:bg-white/6'
            }`}
          >
            <div className="text-sm font-bold">{option.label}</div>
            {option.description ? (
              <div className="mt-1 text-xs leading-5 text-white/60">{option.description}</div>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

