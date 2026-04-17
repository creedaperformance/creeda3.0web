'use client'

import type { ReactNode } from 'react'

interface StepCardProps {
  eyebrow?: string
  title: string
  helper?: string
  footer?: ReactNode
  children: ReactNode
}

export function StepCard({ eyebrow, title, helper, footer, children }: StepCardProps) {
  return (
    <div className="rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-6">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#6ee7b7]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h1>
        {helper ? <p className="max-w-xl text-sm leading-6 text-white/72">{helper}</p> : null}
      </div>

      <div className="mt-6">{children}</div>

      {footer ? <div className="mt-6 border-t border-white/8 pt-4">{footer}</div> : null}
    </div>
  )
}

