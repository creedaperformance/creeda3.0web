import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowLeft,
  BookOpenCheck,
  ChevronRight,
  Dumbbell,
  Filter,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import { RoleDesktopNav } from '@/components/RoleDesktopNav'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import {
  allExerciseLibraryItems,
  queryExercises,
} from '@/lib/product'
import {
  EXERCISE_CATEGORIES,
  SESSION_BLOCK_TYPES,
  SUPPORTED_SPORTS,
  type ExerciseCategory,
  type ExerciseLibraryItem,
  type SessionBlockType,
  type SupportedSport,
} from '@/lib/product/types'
import { getOrCreateTodayExecutionSession } from '@/lib/product/server'
import {
  getRoleHomeRoute,
  getRoleOnboardingRoute,
  isAppRole,
} from '@/lib/auth_utils'

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

function getParam(params: SearchParams | undefined, key: string) {
  const value = params?.[key]
  if (Array.isArray(value)) return value[0]
  return value
}

function fromAllowed<T extends readonly string[]>(
  values: T,
  value: string | undefined
): T[number] | undefined {
  if (!value) return undefined
  return values.includes(value) ? value : undefined
}

function displayToken(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function filterHref(key: string, value: string | null, params: SearchParams | undefined) {
  const next = new URLSearchParams()
  for (const [paramKey, rawValue] of Object.entries(params || {})) {
    const resolved = Array.isArray(rawValue) ? rawValue[0] : rawValue
    if (resolved && paramKey !== key) next.set(paramKey, resolved)
  }
  if (value) next.set(key, value)
  const query = next.toString()
  return query ? `/athlete/exercises?${query}` : '/athlete/exercises'
}

function selectedFilters(params: SearchParams | undefined) {
  return {
    search: getParam(params, 'search') || undefined,
    category: fromAllowed(EXERCISE_CATEGORIES, getParam(params, 'category')) as ExerciseCategory | undefined,
    blockType: fromAllowed(SESSION_BLOCK_TYPES, getParam(params, 'blockType')) as SessionBlockType | undefined,
    sport: fromAllowed(SUPPORTED_SPORTS, getParam(params, 'sport')) as SupportedSport | undefined,
    equipment: getParam(params, 'equipment') || undefined,
    goal: getParam(params, 'goal') || undefined,
  }
}

async function getTodaySessionPreview(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  try {
    return await getOrCreateTodayExecutionSession(supabase, userId)
  } catch {
    return null
  }
}

function getPersonalizedExercises(
  session: Awaited<ReturnType<typeof getTodaySessionPreview>>
) {
  const seen = new Set<string>()
  return (session?.session.blocks || [])
    .flatMap((block) =>
      block.exercises.map((exercise) => ({
        ...exercise,
        blockTitle: block.title,
        blockType: block.type,
      }))
    )
    .filter((exercise) => {
      if (seen.has(exercise.exerciseSlug)) return false
      seen.add(exercise.exerciseSlug)
      return true
    })
    .slice(0, 6)
}

export default async function AthleteExercisesPage(props: {
  searchParams?: Promise<SearchParams>
}) {
  const params = await props.searchParams
  const filters = selectedFilters(params)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.onboarding_completed === false) {
    redirect(getRoleOnboardingRoute('athlete'))
  }

  if (isAppRole(profile.role) && profile.role !== 'athlete') {
    redirect(getRoleHomeRoute(profile.role))
  }

  const todaySession = await getTodaySessionPreview(supabase, user.id)
  const personalizedExercises = getPersonalizedExercises(todaySession)
  const exercises = queryExercises(filters).slice(0, 48)
  const mediaBackedCount = allExerciseLibraryItems.filter(
    (exercise) => exercise.media.source !== 'placeholder'
  ).length

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 pb-24 pt-16 text-white md:pl-72 md:pr-6 md:pt-6">
      <RoleDesktopNav role="athlete" />

      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[30px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <Link
            href="/athlete/dashboard"
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--chakra-neon)]">
                Exercise library
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Browse the movements behind your session
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Warmup, main work, cooldown, recovery, rehab, and sport-specific drills are available from the athlete flow.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="h-12 rounded-2xl bg-[var(--saffron)] px-6 text-sm font-black text-black hover:brightness-110"
              >
                <Link href="/athlete/sessions/today">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Start today
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-2xl border-white/12 bg-transparent px-6 text-sm font-bold text-white hover:bg-white/5"
              >
                <Link href="/athlete/plans">Plan calendar</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={BookOpenCheck}
            label="Catalog"
            value={`${allExerciseLibraryItems.length}`}
            helper="Curated exercises"
          />
          <StatCard
            icon={Sparkles}
            label="Media"
            value={`${mediaBackedCount}`}
            helper="Local demos or sourced media"
          />
          <StatCard
            icon={Dumbbell}
            label="Today"
            value={todaySession?.session.mode.replace(/_/g, ' ') || 'ready'}
            helper={todaySession ? `${todaySession.expectedDurationMinutes} min plan` : 'Session preview available'}
          />
        </section>

        {personalizedExercises.length > 0 ? (
          <section className="rounded-[30px] border border-[var(--saffron)]/20 bg-[var(--saffron)]/8 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--saffron-light)]">
                  Recommended today
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {todaySession?.session.summary.focus}
                </h2>
              </div>
              <Link
                href="/athlete/sessions/today"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--saffron)] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:brightness-110"
              >
                Start flow
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {personalizedExercises.map((exercise) => (
                <div
                  key={exercise.exerciseSlug}
                  className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    {displayToken(exercise.blockType)} / {exercise.blockTitle}
                  </p>
                  <h3 className="mt-2 text-lg font-black text-white">{exercise.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    {exercise.explanation[0] || 'Selected for today based on readiness, sport context, and constraints.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-300">
                      {exercise.prescribed.sets} sets
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-300">
                      {exercise.prescribed.reps || `${exercise.prescribed.durationSeconds || 0}s`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-[30px] border border-white/8 bg-white/[0.03] p-5">
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-[var(--chakra-neon)]" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Find exercises
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight">
                Filter by block, sport, equipment, or search
              </h2>
            </div>
          </div>

          <form className="mt-5 grid gap-3 lg:grid-cols-[1fr_180px_180px_180px_120px]" action="/athlete/exercises">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                name="search"
                defaultValue={filters.search || ''}
                placeholder="Search squat, shoulder, sprint..."
                className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[var(--chakra-neon)]/40"
              />
            </label>

            <Select name="category" label="Category" value={filters.category} values={EXERCISE_CATEGORIES} />
            <Select name="blockType" label="Block" value={filters.blockType} values={SESSION_BLOCK_TYPES} />
            <Select name="sport" label="Sport" value={filters.sport} values={SUPPORTED_SPORTS} />

            <button
              type="submit"
              className="h-12 rounded-2xl bg-white px-4 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-slate-200"
            >
              Search
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ['All', null],
              ['Warmup', 'warmup'],
              ['Main', 'main'],
              ['Cooldown', 'cooldown'],
              ['Recovery', 'recovery'],
              ['Rehab', 'rehab'],
            ].map(([label, value]) => (
              <Link
                key={label}
                href={filterHref('blockType', value, params)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] transition ${
                  filters.blockType === value || (!filters.blockType && value === null)
                    ? 'border-[var(--saffron)]/30 bg-[var(--saffron)]/10 text-[var(--saffron-light)]'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Results
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">
                {exercises.length} visible exercises
              </h2>
            </div>
            <Link
              href="/athlete/exercises"
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300 transition hover:bg-white/[0.06]"
            >
              Clear filters
            </Link>
          </div>

          {exercises.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {exercises.map((exercise) => (
                <ExerciseCard key={exercise.slug} exercise={exercise} />
              ))}
            </div>
          ) : (
            <div className="rounded-[30px] border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
              <p className="text-xl font-black text-white">No exercises match those filters</p>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-400">
                Clear the filters or open today&apos;s session to see the recommended blocks CREEDA generated for you.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild className="h-12 rounded-2xl bg-[var(--saffron)] px-6 text-sm font-black text-black hover:brightness-110">
                  <Link href="/athlete/sessions/today">Open today&apos;s session</Link>
                </Button>
                <Button asChild variant="outline" className="h-12 rounded-2xl border-white/12 bg-transparent px-6 text-sm font-bold text-white hover:bg-white/5">
                  <Link href="/athlete/exercises">Clear filters</Link>
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Select<T extends readonly string[]>({
  name,
  label,
  value,
  values,
}: {
  name: string
  label: string
  value?: string
  values: T
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={value || ''}
        className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-[var(--chakra-neon)]/40"
      >
        <option value="">{label}</option>
        {values.map((option) => (
          <option key={option} value={option}>
            {displayToken(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof BookOpenCheck
  label: string
  value: string
  helper: string
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        <Icon className="h-4 w-4 text-[var(--chakra-neon)]" />
        {label}
      </div>
      <p className="mt-3 text-3xl font-black capitalize text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{helper}</p>
    </div>
  )
}

function ExerciseCard({ exercise }: { exercise: ExerciseLibraryItem }) {
  const image = exercise.media.imageUrls[0] || `/media/exercises/fallback/${exercise.category}.svg`

  return (
    <article className="overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.03]">
      <div className="relative aspect-video bg-black/25">
        <img
          src={image}
          alt={exercise.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
          {displayToken(exercise.category)}
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <h3 className="text-lg font-black leading-tight text-white">{exercise.name}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400">
            {exercise.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {exercise.suitableBlocks.slice(0, 3).map((block) => (
            <span
              key={block}
              className="rounded-full border border-[var(--chakra-neon)]/20 bg-[var(--chakra-neon)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--chakra-neon)]"
            >
              {displayToken(block)}
            </span>
          ))}
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {displayToken(exercise.difficulty)}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MiniSpec label="Prescription" value={`${exercise.defaultPrescription.sets} sets`} />
          <MiniSpec
            label="Reps / Time"
            value={exercise.defaultPrescription.reps || `${exercise.defaultPrescription.durationSeconds || 0}s`}
          />
        </div>

        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            <ShieldCheck className="h-4 w-4 text-[var(--saffron-light)]" />
            First cue
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {exercise.coachingCues[0] || exercise.instructions[0] || 'Move with control and stop if pain changes sharply.'}
          </p>
        </div>

        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {exercise.equipmentRequired.slice(0, 3).map(displayToken).join(' / ')}
        </div>
      </div>
    </article>
  )
}

function MiniSpec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-white">{value}</p>
    </div>
  )
}
