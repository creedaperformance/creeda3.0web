'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  Apple,
  Brain,
  CalendarRange,
  Dumbbell,
  Flag,
  Gauge,
  Moon,
  Droplets,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'

import { DashboardLayout } from '@/components/DashboardLayout'
import { Badge } from '@/components/ui/badge'
import type { IndividualDashboardSnapshot } from '@/lib/dashboard_decisions'
import { NutritionPrescriptionView } from '@/app/athlete/dashboard/components/NutritionPrescriptionView'
import { WorkoutPrescriptionView } from '@/app/athlete/dashboard/components/WorkoutPrescriptionView'
import { VideoAnalysisSummaryCard } from '@/components/video-analysis/VideoAnalysisSummaryCard'

import { IndividualDecisionHUD } from './IndividualDecisionHUD'

interface IndividualDashboardClientProps {
  profile: Record<string, unknown> | null
  snapshot: IndividualDashboardSnapshot
}

export function IndividualDashboardClient({
  profile,
  snapshot,
}: IndividualDashboardClientProps) {
  const decision = snapshot.decision
  const current = decision?.currentState
  const peak = decision?.peakState
  const pathway = decision?.pathway

  return (
    <DashboardLayout type="individual" user={profile}>
      <div className="space-y-8 pb-20">
        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <SurfacePanel className="p-8 sm:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,124,0,0.18),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_40%)]" />
            <div className="relative">
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm"
              >
                <Sparkles className="h-3 w-3 mr-2" />
                Digital Sports Scientist For Daily Life
              </Badge>

              <h1 className="mt-6 text-4xl sm:text-5xl font-black tracking-tight text-white leading-[0.95]">
                Your body,
                <span className="block text-primary">explained simply.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm sm:text-base text-slate-300/80 leading-relaxed">
                CREEDA turns your FitStart baseline, daily signals, and optional device data into one clear daily direction for healthier living.
              </p>

              {pathway && (
                <div className="flex flex-wrap gap-2 mt-6">
                  <InfoTag icon={Flag} text={pathway.title} />
                  <InfoTag
                    icon={Target}
                    text={
                      pathway.type === 'sport'
                        ? pathway.mappedSport
                        : pathway.type === 'training'
                          ? `Training: ${pathway.mappedSport}`
                          : 'Healthy living'
                    }
                  />
                  <InfoTag icon={Brain} text={snapshot.primaryGoal.replace('_', ' ')} />
                </div>
              )}

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <CompactStat
                  label="Current Path"
                  value={pathway?.title || 'Guided path'}
                  detail={pathway?.rationale || 'CREEDA is matching your physiology to the right next step.'}
                />
                <CompactStat
                  label="Decision Trust"
                  value={decision?.health.usedInDecision ? 'Blended' : 'Manual'}
                  detail={
                    decision?.health.usedInDecision
                      ? `Device data influencing ${decision.health.influencePct}%`
                      : 'Built from FitStart and daily check-ins'
                  }
                />
                <CompactStat
                  label="Primary Goal"
                  value={snapshot.primaryGoal.replace('_', ' ') || 'General fitness'}
                  detail="Guidance is tuned around the outcome you picked in FitStart."
                />
              </div>
            </div>
          </SurfacePanel>

          <SurfacePanel className="p-8 sm:p-9">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.09),transparent_42%),linear-gradient(160deg,rgba(15,23,42,0.9),rgba(2,6,23,0.88))]" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Today At A Glance</p>
                  <p className="mt-3 text-sm text-slate-300/75 leading-relaxed">
                    One calm surface for readiness, progression, and weekly rhythm.
                  </p>
                </div>
                <ReadinessDial score={snapshot.readinessScore} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SnapshotTile
                  icon={TrendingUp}
                  label="Peak Progress"
                  value={`${Math.round(decision?.journeyState.progressToPeakPct || 0)}%`}
                />
                <SnapshotTile
                  icon={CalendarRange}
                  label="Current Week"
                  value={`${decision?.journeyState.currentWeek || 1}/${decision?.journeyState.totalWeeks || 1}`}
                />
                <SnapshotTile
                  icon={Sparkles}
                  label="Streak"
                  value={`${decision?.journeyState.streakCount || 0}d`}
                />
                <SnapshotTile
                  icon={ShieldCheck}
                  label="Sync State"
                  value={decision?.health.summary?.connected ? 'Connected' : 'Manual'}
                />
              </div>
            </div>
          </SurfacePanel>
        </section>

        <IndividualDecisionHUD decision={decision} />

        <VideoAnalysisSummaryCard
          role="individual"
          latestReport={snapshot.latestVideoReport}
          preferredSport={snapshot.sport}
        />

        {decision?.prescriptions && (
          <section className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
              <SurfacePanel className="p-8 sm:p-9">
                <div className="relative">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Actionable Prescription</p>
                  <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    Exactly what to do and how to fuel it
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm text-slate-400 leading-relaxed">
                    This block is generated on the server from your physiology, pathway, daily readiness, and connected health signals. It uses research-backed movement and nutrition targets instead of generic dashboard filler.
                  </p>

                  <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <PrescriptionMetric
                      icon={Dumbbell}
                      label="Strength Days"
                      value={`${decision.prescriptions.trainingFramework.strengthDaysPerWeek}/wk`}
                      detail={`Build around ${decision.prescriptions.trainingFramework.weeklyAerobicMinutes} aerobic min/week.`}
                    />
                    <PrescriptionMetric
                      icon={Apple}
                      label="Protein"
                      value={`${decision.prescriptions.nutritionFramework.proteinTarget}g`}
                      detail={`Split into ${decision.prescriptions.nutritionFramework.proteinFeedings} feedings of ~${decision.prescriptions.nutritionFramework.proteinPerFeeding}g.`}
                    />
                    <PrescriptionMetric
                      icon={Droplets}
                      label="Hydration"
                      value={`${decision.prescriptions.nutritionFramework.hydrationLiters}L`}
                      detail="Baseline fluid target before adding sweat-loss needs."
                    />
                    <PrescriptionMetric
                      icon={Moon}
                      label="Sleep"
                      value={`${decision.prescriptions.trainingFramework.sleepTargetHours}h`}
                      detail={`Cap weekly load jumps near ${decision.prescriptions.trainingFramework.progressionCapPct}%.`}
                    />
                  </div>

                  <div className="mt-8 grid gap-4 lg:grid-cols-2">
                    <ResearchList
                      title="Movement logic"
                      items={decision.prescriptions.trainingFramework.rationale}
                    />
                    <ResearchList
                      title="Nutrition logic"
                      items={decision.prescriptions.nutritionFramework.rationale}
                    />
                  </div>
                </div>
              </SurfacePanel>

              <SurfacePanel className="p-8 sm:p-9">
                <div className="relative">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Research Anchors</p>
                  <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
                    Why CREEDA is recommending this
                  </h2>
                  <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                    These are the baseline evidence sources shaping your movement dose, progressive overload, recovery floor, and macro targets.
                  </p>

                  <div className="mt-6 space-y-3">
                    {decision.prescriptions.sources.map((source) => (
                      <SourceCard
                        key={source.id}
                        label={source.shortLabel}
                        title={source.title}
                        detail={source.application}
                      />
                    ))}
                  </div>
                </div>
              </SurfacePanel>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <SurfacePanel className="p-8 sm:p-9">
                <div className="relative">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Today&apos;s Movement Prescription</p>
                  <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
                    Train for real life, not a fake athlete template
                  </h2>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <InfoTag icon={Activity} text={`${decision.prescriptions.trainingFramework.weeklyAerobicMinutes} min/week`} />
                    <InfoTag icon={Dumbbell} text={`${decision.prescriptions.trainingFramework.strengthDaysPerWeek} strength days`} />
                    <InfoTag icon={TrendingUp} text={`${decision.prescriptions.trainingFramework.progressionCapPct}% load cap`} />
                  </div>
                  <div className="mt-6">
                    <WorkoutPrescriptionView plan={decision.prescriptions.workoutPlan} />
                  </div>
                </div>
              </SurfacePanel>

              <SurfacePanel className="p-8 sm:p-9">
                <div className="relative">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Today&apos;s Nutrition Prescription</p>
                  <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
                    Fuel matched to your goal and actual demand
                  </h2>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <InfoTag icon={Apple} text={`${decision.prescriptions.nutritionFramework.calories} kcal`} />
                    <InfoTag icon={Target} text={`${decision.prescriptions.nutritionFramework.carbTarget}g carbs`} />
                    <InfoTag icon={Droplets} text={`${decision.prescriptions.nutritionFramework.hydrationLiters}L baseline`} />
                  </div>
                  <div className="mt-6">
                    <NutritionPrescriptionView meals={decision.prescriptions.mealPlan} />
                  </div>
                </div>
              </SurfacePanel>
            </section>
          </section>
        )}

        {current && peak && (
          <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <SurfacePanel className="p-8 sm:p-9">
              <div className="relative">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Body Map</p>
                <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Current vs next stronger state
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-slate-400 leading-relaxed">
                  These scores come from your FitStart profile, daily check-ins, and optional device data when connected.
                </p>

                <div className="mt-8 space-y-5">
                  <MetricRail
                    label="Readiness"
                    current={current.readinessScore}
                    target={peak.targetReadiness}
                    note="Daily capacity, recovery quality, and how much strain your body can handle today."
                    icon={Gauge}
                  />
                  <MetricRail
                    label="Strength"
                    current={current.strengthProfile}
                    target={peak.targetStrength}
                    note="Your current force and lifting capacity for daily life, training, and sport entry."
                    icon={Activity}
                  />
                  <MetricRail
                    label="Endurance"
                    current={current.enduranceLevel}
                    target={peak.targetEndurance}
                    note="How well you can sustain movement without fading too early."
                    icon={TrendingUp}
                  />
                  <MetricRail
                    label="Mobility"
                    current={current.mobilityStatus}
                    target={peak.targetMobility}
                    note="How comfortably and efficiently your body can move through useful ranges."
                    icon={Moon}
                  />
                </div>
              </div>
            </SurfacePanel>

            <div className="space-y-6">
              <SurfacePanel className="p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">This Week&apos;s Anchors</p>
                <div className="mt-6 space-y-3">
                  {(decision?.plan.lifestylePlan.habitGoals || []).map((goal, index) => (
                    <div
                      key={goal}
                      className="flex items-start gap-4 border-b border-white/[0.06] pb-4 last:border-b-0 last:pb-0"
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                        {index + 1}
                      </span>
                      <p className="text-sm text-slate-200 leading-relaxed">{goal}</p>
                    </div>
                  ))}
                </div>
              </SurfacePanel>

              <SurfacePanel className="p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Journey Projection</p>
                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-black tracking-tight text-white">
                      {decision?.peak.weeksRemaining || 0}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">Weeks to your next stronger baseline</p>
                  </div>
                  <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-300">
                    {Math.round(decision?.journeyState.progressToPeakPct || 0)}% complete
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {(decision?.peak.visualMilestones || []).map((milestone) => (
                    <div key={milestone.label}>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-white">{milestone.label}</p>
                        <p className="text-xs text-slate-500">{milestone.progressPct}%</p>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${milestone.progressPct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-primary via-amber-300 to-emerald-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </SurfacePanel>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  )
}

function SurfacePanel({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-[2.35rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(2,6,23,0.94))] shadow-[0_18px_80px_rgba(2,6,23,0.35)] ${className}`}
    >
      {children}
    </section>
  )
}

function ReadinessDial({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(score)))

  return (
    <div className="relative grid h-32 w-32 place-items-center rounded-full">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(rgba(245,124,0,1) ${pct}%, rgba(255,255,255,0.08) ${pct}% 100%)`,
        }}
      />
      <div className="absolute inset-[10px] rounded-full bg-slate-950/95" />
      <div className="relative text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Readiness</p>
        <p className="mt-2 text-3xl font-black tracking-tight text-white">{pct}</p>
      </div>
    </div>
  )
}

function CompactStat({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-3 text-lg font-bold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{detail}</p>
    </div>
  )
}

function SnapshotTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge
  label: string
  value: string
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-black tracking-tight text-white">{value}</p>
    </div>
  )
}

function MetricRail({
  label,
  current,
  target,
  note,
  icon: Icon,
}: {
  label: string
  current: number
  target: number
  note: string
  icon: typeof Gauge
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0

  return (
    <div className="rounded-[1.8rem] border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{label}</p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{note}</p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-3xl font-black tracking-tight text-white">{Math.round(current)}</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
            Target {Math.round(target)}
          </p>
        </div>
      </div>

      <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-primary via-amber-300 to-emerald-400"
        />
      </div>
    </div>
  )
}

function InfoTag({
  icon: Icon,
  text,
}: {
  icon: typeof Flag
  text: string
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {text}
    </span>
  )
}

function PrescriptionMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Gauge
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{detail}</p>
    </div>
  )
}

function ResearchList({
  title,
  items,
}: {
  title: string
  items: string[]
}) {
  return (
    <div className="rounded-[1.8rem] border border-white/[0.08] bg-white/[0.03] p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <p className="text-sm leading-relaxed text-slate-300">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SourceCard({
  label,
  title,
  detail,
}: {
  label: string
  title: string
  detail: string
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">{label}</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-white">{title}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{detail}</p>
        </div>
      </div>
    </div>
  )
}
