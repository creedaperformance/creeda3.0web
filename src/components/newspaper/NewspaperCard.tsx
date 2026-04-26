'use client'

import Link from 'next/link'
import { ArrowRight, Newspaper, Sparkles } from 'lucide-react'

import type { WeeklyNewspaperRow } from '@/lib/newspaper/queries'

export function NewspaperCard({ paper }: { paper: WeeklyNewspaperRow | null }) {
  if (!paper) {
    return (
      <section className="rounded-[28px] border border-white/[0.06] bg-[#0F1015] p-5 sm:p-6 text-white">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
          <Newspaper className="h-3.5 w-3.5" /> Weekly newspaper
        </div>
        <h3 className="mt-2 text-lg font-black tracking-tight">
          Your first weekly newspaper drops Monday morning.
        </h3>
        <p className="mt-1 text-[12px] leading-relaxed text-white/55">
          Every week, Creeda reads your training, sleep, readiness, and check-ins, and writes you a
          one-glance digest — last week&apos;s numbers, one win, one focus, two next-week actions.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-[28px] border border-white/[0.06] bg-[#0F1015] p-5 sm:p-6 text-white">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-300">
        <Newspaper className="h-3.5 w-3.5" /> Weekly newspaper · week of{' '}
        {paper.week_start_date}
      </div>
      <h3 className="mt-2 text-xl font-black leading-tight tracking-tight">
        {paper.headline}
      </h3>

      {paper.hero_value ? (
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-black tracking-tight text-white">{paper.hero_value}</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
            {paper.hero_metric ?? 'Hero metric'}
          </span>
        </div>
      ) : null}

      {paper.numbers.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {paper.numbers.slice(0, 6).map((num) => (
            <div
              key={`${num.label}-${num.value}`}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                {num.label}
              </p>
              <p className="mt-1 text-base font-black tracking-tight text-white">{num.value}</p>
              {num.delta ? (
                <p className="mt-0.5 text-[11px] text-emerald-300">{num.delta}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {paper.one_win ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.04] p-3">
          <Sparkles className="mt-0.5 h-4 w-4 text-emerald-300" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
              One win
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-white/82">{paper.one_win}</p>
          </div>
        </div>
      ) : null}

      {paper.one_focus ? (
        <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            One focus
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/82">{paper.one_focus}</p>
        </div>
      ) : null}

      {paper.next_week_actions.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            Next week
          </p>
          <ul className="mt-1.5 space-y-1.5 text-[12px] leading-relaxed text-white/65">
            {paper.next_week_actions.slice(0, 4).map((action) => (
              <li key={action} className="flex items-start gap-2">
                <span aria-hidden className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#6ee7b7]" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Link
        href="/newspapers"
        className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#6ee7b7] hover:text-[#a7f3d0]"
      >
        Past newspapers <ArrowRight className="h-3 w-3" />
      </Link>
    </section>
  )
}
