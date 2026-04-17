'use client'

import type { FormOption } from '@/forms/types'

interface EmojiScaleProps {
  options: FormOption[]
  value: string | number | boolean | null | undefined
  onChange: (value: string | number | boolean) => void
}

export function EmojiScale({ options, value, onChange }: EmojiScaleProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {options.map((option) => {
        const active = value === option.value

        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-3xl border px-3 py-4 text-center transition ${
              active
                ? 'border-[#00d4ff] bg-[#00d4ff]/12 text-white shadow-[0_0_0_1px_rgba(0,212,255,0.2)]'
                : 'border-white/12 bg-white/4 text-white/78 hover:border-white/22'
            }`}
          >
            <div className="text-2xl">{option.emoji ?? '🙂'}</div>
            <div className="mt-2 text-[11px] font-semibold leading-4">{option.label}</div>
          </button>
        )
      })}
    </div>
  )
}

