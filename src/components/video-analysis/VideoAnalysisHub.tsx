'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Camera, ChevronRight, History, Search, Video } from 'lucide-react'
import { motion } from 'framer-motion'

import { createClient } from '@/lib/supabase/client'
import { listVideoAnalysisSports, canonicalizeSportId, type VideoAnalysisRole } from '@/lib/video-analysis/catalog'
import { normalizeVideoAnalysisReport, type VideoAnalysisReportSummary } from '@/lib/video-analysis/reporting'

interface Props {
  role: VideoAnalysisRole
  dashboardHref: string
  preferredSport?: string | null
}

export function VideoAnalysisHub({ role, dashboardHref, preferredSport }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const incomingSport = useMemo(
    () => canonicalizeSportId(searchParams?.get('sport') || preferredSport || '') || null,
    [preferredSport, searchParams]
  )
  const [selectedSport, setSelectedSport] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [recentReports, setRecentReports] = useState<VideoAnalysisReportSummary[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const effectiveSelectedSport = selectedSport || incomingSport

  useEffect(() => {
    const fetchHistory = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoadingHistory(false)
        return
      }

      const { data, error } = await supabase
        .from('video_analysis_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

      if (!error) {
        setRecentReports(
          (Array.isArray(data) ? data : [])
            .map(normalizeVideoAnalysisReport)
            .filter((report): report is VideoAnalysisReportSummary => Boolean(report))
        )
      }

      setLoadingHistory(false)
    }

    fetchHistory()
  }, [])

  const sports = useMemo(() => {
    const all = listVideoAnalysisSports(preferredSport)
    if (!query.trim()) return all

    const q = query.trim().toLowerCase()
    return all.filter((sport) =>
      `${sport.sportLabel} ${sport.shortPrompt}`.toLowerCase().includes(q)
    )
  }, [preferredSport, query])

  const handleStartScan = () => {
    if (!effectiveSelectedSport) return
    router.push(`/${role}/scan/analyze?sport=${effectiveSelectedSport}`)
  }

  const pageTitle = role === 'athlete' ? 'Video Analysis' : 'Movement Analysis'
  const pageSubtitle =
    role === 'athlete'
      ? 'Upload a short clip to audit sport mechanics and joint control'
      : 'Upload a short clip to audit movement quality and healthy-living mechanics'

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-white pt-16 pb-24 px-5">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Link href={dashboardHref} className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{pageTitle}</h1>
            <p className="text-xs text-white/40 font-medium">{pageSubtitle}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-300">
                  <Video className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Select Sport</p>
                  <p className="text-sm text-slate-300">Pick the sport or movement context you want CREEDA to audit.</p>
                </div>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search sports"
                  className="w-full rounded-2xl border border-white/[0.08] bg-black/20 pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-orange-500/40"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[540px] overflow-y-auto pr-1">
                {sports.map((sport) => (
                  <button
                    key={sport.sportId}
                    onClick={() => setSelectedSport(sport.sportId)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      effectiveSelectedSport === sport.sportId
                        ? 'border-orange-500/30 bg-orange-500/10'
                        : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{sport.emoji}</span>
                      <div>
                        <p className="text-sm font-bold text-white">{sport.sportLabel}</p>
                        <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{sport.shortPrompt}</p>
                        <p className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">{sport.captureView}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <motion.div whileTap={{ scale: 0.98 }}>
                <button
                  onClick={handleStartScan}
                  disabled={!effectiveSelectedSport}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl transition-all ${
                    effectiveSelectedSport
                      ? 'bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/15'
                      : 'bg-white/[0.02] border border-white/[0.04] opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${effectiveSelectedSport ? 'bg-orange-500 text-black' : 'bg-white/[0.06] text-white/30'}`}>
                    <Camera className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-white">Analyze clip</p>
                    <p className="text-[11px] text-white/35">
                      Upload or record a 5-30 second clip, then let CREEDA build your correction report.
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/20" />
                </button>
              </motion.div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-xs font-semibold text-white/60 mb-3">Best capture tips</p>
                <ul className="space-y-2 text-xs text-white/35">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-300 mt-0.5">•</span>
                    Keep the full body visible, including feet and landing.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-300 mt-0.5">•</span>
                    Stable side or 45-degree footage gives the cleanest joint reads.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-300 mt-0.5">•</span>
                    Use 2-4 repetitions of the same movement rather than one rushed attempt.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500 mb-4 flex items-center gap-2">
                <History className="h-3.5 w-3.5" />
                Recent Sessions
              </p>

              {loadingHistory ? (
                <p className="text-xs text-slate-500">Loading your recent scans...</p>
              ) : recentReports.length === 0 ? (
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your first scan will appear here with movement score, technical faults, and next-step drills.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentReports.map((report) => (
                    <Link
                      key={report.id}
                      href={`/${role}/scan/report/${report.id}`}
                      className="block rounded-2xl border border-white/[0.06] bg-black/20 p-4 hover:bg-white/[0.04] transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-white">{report.sportLabel}</p>
                          <p className="mt-1 text-[11px] text-slate-400">{report.summary.headline}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-white">{report.summary.score}%</p>
                          <p className="text-[9px] uppercase tracking-widest text-slate-500">{report.summary.status}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
