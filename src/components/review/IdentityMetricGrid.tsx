import type { IdentityMetricSummary, SquadIdentityMetricSummary } from '@/lib/identity-metrics'

type IdentityMetricLike = IdentityMetricSummary | SquadIdentityMetricSummary

function getStatusClasses(status: IdentityMetricLike['status']) {
  switch (status) {
    case 'elite':
      return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
    case 'strong':
      return 'border-blue-400/25 bg-blue-400/10 text-blue-200'
    case 'building':
      return 'border-amber-400/25 bg-amber-400/10 text-amber-200'
    case 'fragile':
      return 'border-rose-400/25 bg-rose-400/10 text-rose-200'
    default:
      return 'border-white/[0.08] bg-white/[0.04] text-slate-300'
  }
}

function getStatusLabel(status: IdentityMetricLike['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function IdentityMetricGrid({
  metrics,
  showSquadContext = false,
}: {
  metrics: IdentityMetricLike[]
  showSquadContext?: boolean
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => {
        const squadContext =
          showSquadContext && 'athleteCount' in metric
            ? `${metric.athleteCount} athletes${metric.flaggedCount > 0 ? ` • ${metric.flaggedCount} flagged` : ''}`
            : null

        return (
          <div
            key={metric.key}
            className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.03] p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Identity metric
                </p>
                <h3 className="mt-2 text-lg font-bold tracking-tight text-white">{metric.label}</h3>
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${getStatusClasses(metric.status)}`}
              >
                {getStatusLabel(metric.status)}
              </span>
            </div>

            <div className="mt-5 flex items-end justify-between gap-3">
              <p className="text-3xl font-black tracking-tight text-white">
                {metric.score === null ? 'Inactive' : metric.score}
              </p>
              {metric.score !== null ? (
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  /100 score
                </p>
              ) : null}
            </div>

            {squadContext ? (
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {squadContext}
              </p>
            ) : null}

            <p className="mt-4 text-sm leading-relaxed text-slate-300">{metric.summary}</p>

            <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Next action
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{metric.nextAction}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
