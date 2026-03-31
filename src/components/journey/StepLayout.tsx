'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { JourneyShell } from './JourneyShell'
import { JourneyProgressBar } from './JourneyProgressBar'
import { JourneyButton } from './JourneyButton'

type StepLayoutProps = {
  title: string
  subtitle: string
  step: number
  totalSteps: number
  nextHref: string
  backHref: string
  nextLabel?: string
  canContinue?: boolean
  onNext?: () => boolean | Promise<boolean>
  onBack?: () => boolean | Promise<boolean>
  children: ReactNode
}

export function StepLayout({
  title,
  subtitle,
  step,
  totalSteps,
  nextHref,
  backHref,
  nextLabel = 'Continue',
  canContinue = true,
  onNext,
  onBack,
  children,
}: StepLayoutProps) {
  const router = useRouter()
  const progress = (step / totalSteps) * 100

  const handleNext = async () => {
    const shouldContinue = onNext ? await onNext() : true
    if (!shouldContinue) return
    router.push(nextHref)
  }

  const handleBack = async () => {
    const shouldBack = onBack ? await onBack() : true
    if (!shouldBack) return
    router.push(backHref)
  }

  return (
    <JourneyShell>
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#2DD4BF]">
            Step {step} of {totalSteps}
          </p>
          <JourneyProgressBar value={progress} />
          <h1 className="text-3xl font-black tracking-tight">{title}</h1>
          <p className="text-sm text-white/65">{subtitle}</p>
        </div>

        <div className="space-y-6">{children}</div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <JourneyButton variant="secondary" onClick={handleBack}>
            Back
          </JourneyButton>
          <JourneyButton onClick={handleNext} disabled={!canContinue}>
            {nextLabel}
          </JourneyButton>
        </div>
      </div>
    </JourneyShell>
  )
}
