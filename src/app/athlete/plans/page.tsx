'use client'

import Link from 'next/link'
import { ArrowLeft, ClipboardList, Dumbbell, Apple, HeartPulse, Lock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/i18n/LanguageProvider'

export default function PlansPage() {
  const { t } = useTranslation()

  const planTypes = [
    {
      key: 'training',
      icon: Dumbbell,
      color: '#FF9933',
      glow: 'rgba(255,153,51,0.2)',
      title: t('plans.training', 'Training'),
      desc: 'Weekly workout plan with exercises, sets & reps tailored to your sport and level',
      available: true,
    },
    {
      key: 'nutrition',
      icon: Apple,
      color: '#1DB954',
      glow: 'rgba(29,185,84,0.2)',
      title: t('plans.nutrition', 'Nutrition'),
      desc: 'Indian diet-aware meal plans with macros for dal, roti, rice, chicken, paneer & more',
      available: true,
    },
    {
      key: 'recovery',
      icon: HeartPulse,
      color: '#0A84FF',
      glow: 'rgba(10,132,255,0.2)',
      title: t('plans.recovery', 'Recovery'),
      desc: 'Sleep optimization, stretching routines & active recovery protocols',
      available: true,
    },
  ]

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-white pt-16 pb-24 px-5">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/athlete/dashboard" className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ fontStyle: 'normal' }}>
              {t('plans.title', 'Your Plan')}
            </h1>
            <p className="text-xs text-white/40 font-medium" style={{ fontStyle: 'normal', textTransform: 'none', letterSpacing: 'normal' }}>
              AI-generated training, nutrition & recovery
            </p>
          </div>
        </div>

        {/* Generate New Plan CTA */}
        <Link href="/athlete/plans/generate">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[var(--saffron)]/10 to-transparent border border-[var(--saffron)]/15 mb-8 group hover:border-[var(--saffron)]/30 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-[var(--saffron)] flex items-center justify-center shadow-lg shadow-[var(--saffron-glow)]">
                  <ClipboardList className="h-5 w-5 text-black" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white" style={{ fontStyle: 'normal' }}>
                    {t('plans.generate', 'Generate New Plan')}
                  </p>
                  <p className="text-[11px] text-white/35" style={{ fontStyle: 'normal', textTransform: 'none', letterSpacing: 'normal' }}>
                    Personalized for your sport & goals
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--saffron)]/50 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Plan Type Cards */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-1" style={{ fontStyle: 'normal' }}>
            {t('plans.this_week', 'This Week')}
          </p>

          {planTypes.map((plan) => {
            const Icon = plan.icon
            return (
              <div
                key={plan.key}
                className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all"
              >
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border border-white/[0.08]"
                  style={{ backgroundColor: plan.glow }}
                >
                  <Icon className="h-6 w-6" style={{ color: plan.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white mb-0.5" style={{ fontStyle: 'normal' }}>
                    {plan.title}
                  </p>
                  <p className="text-[11px] text-white/35 leading-relaxed" style={{ fontStyle: 'normal', textTransform: 'none', letterSpacing: 'normal' }}>
                    {plan.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        <div className="mt-8 p-8 rounded-2xl bg-white/[0.01] border border-dashed border-white/[0.06] text-center">
          <div className="h-14 w-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="h-7 w-7 text-white/15" />
          </div>
          <p className="text-sm font-semibold text-white/30 mb-1" style={{ fontStyle: 'normal' }}>
            No active plan yet
          </p>
          <p className="text-xs text-white/20 mb-5" style={{ fontStyle: 'normal', textTransform: 'none', letterSpacing: 'normal' }}>
            Generate your first personalized plan to get started
          </p>
          <Button
            asChild
            className="h-10 px-6 rounded-xl bg-[var(--saffron)] text-black font-bold text-xs hover:brightness-110 transition-all"
          >
            <Link href="/athlete/plans/generate">
              Generate Plan
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
