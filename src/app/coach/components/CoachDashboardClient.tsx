'use client'

import { useState, useEffect, useMemo, memo, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  Users, AlertCircle, ChevronRight, Activity, ShieldAlert, 
  PlusCircle, MessageSquare, CheckCircle2, TrendingUp, 
  Search, LogOut, Settings, Copy, Check, Zap, Minus, Trophy, Brain,
  Loader2, ShieldCheck, RotateCcw, Scale, Flame
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { AddAthleteForm } from './AddAthleteForm'
import { IntelligenceCard } from '@/components/IntelligenceCard'
import { SquadTrendsChart } from './SquadTrendsChart'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { getOrCreateLockerCode, useLockerCode } from '@/lib/actions/connection'
import { archiveAthlete, restoreAthlete, removeAthlete } from '@/lib/actions/roster'
import { approveConnectionRequest, denyConnectionRequest } from '@/lib/actions/coach_actions'

interface CoachDashboardClientProps {
  profile: any
  user: any
  processedRoster: any[]
  topProblems: any[]
  teamIds: string[]
  myTeams: any[]
  pendingRequests: any[]
  squadTrends?: any[]
}

function SquadLimiterHeatmap({ roster }: { roster: any[] }) {
  const limiterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    roster.forEach(a => {
      const limiter = a.physiologySummary?.likelyLimiter;
      if (limiter && limiter !== 'None' && limiter !== 'General Volume') {
        counts[limiter] = (counts[limiter] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [roster]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {limiterCounts.length === 0 ? (
          <p className="text-xs font-medium text-slate-500">No systemic limiters detected in reported data.</p>
        ) : (
          limiterCounts.map(([limiter, count]) => (
            <div key={limiter} className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3 transition-all hover:bg-slate-800 group">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{limiter}</span>
              <div className="h-3 w-[1px] bg-slate-800" />
              <span className="text-sm font-bold text-white">{count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const AthleteRosterRow = memo(function AthleteRosterRow({ 
  athlete, 
  onArchive, 
  onRestore, 
  onRemove,
  onViewAnalytics
}: { 
  athlete: any, 
  onArchive: (id: string) => void,
  onRestore: (id: string) => void,
  onRemove: (id: string) => void,
  onViewAnalytics: (id: string) => void
}) {
  return (
    <tr className="hover:bg-white/5 transition-colors group">
      <td className="py-10 px-10">
          <div className="flex items-center gap-6">
            <div className="h-14 w-14 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 shadow-sm relative">
                {athlete.avatar ? <img src={athlete.avatar} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center font-bold text-slate-700 bg-slate-950 uppercase text-lg">{athlete.name[0]}</div>}
            </div>
            <div>
                <p className="text-lg font-bold text-white tracking-tight leading-none mb-1">{athlete.name}</p>
                <p className="text-xs font-medium text-slate-500">@{athlete.username}</p>
            </div>
          </div>
      </td>
      <td className="py-10 px-4 text-center">
          <span className={`text-xl font-bold ${athlete.readiness >= 75 ? 'text-primary' : (athlete.readiness < 40 ? 'text-red-500' : 'text-slate-400')}`}>
            {athlete.readiness}%
          </span>
      </td>
      <td className="py-10 px-4">
          <div className={`inline-block px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${
            athlete.priority === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
            athlete.priority === 'Warning' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
            'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
          }`}>
            {athlete.trainingStatus === 'NO_DATA' ? 'NO DATA' : athlete.trainingStatus}
          </div>
      </td>
      <td className="py-10 px-4 max-w-[300px]">
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-white leading-tight">{athlete.reason}</p>
          <div className="flex items-center gap-2">
             <div className="h-1 w-1 rounded-full bg-primary" />
             <p className="text-[10px] font-medium text-slate-500 leading-relaxed uppercase">{athlete.action}</p>
          </div>
        </div>
      </td>
      <td className="py-10 px-10 text-right">
          <div className="flex items-center justify-end gap-3">
            <Button
                size="sm"
                variant="outline"
                className="h-10 px-6 rounded-xl bg-slate-900 border-slate-800 hover:bg-slate-800 font-bold text-[10px] uppercase tracking-wider text-white transition-all shadow-sm"
                onClick={() => onViewAnalytics(athlete.id)}
            >
                View Analytics
                <ChevronRight className="h-3 w-3 ml-2" />
            </Button>
            <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 text-slate-500 hover:text-red-500 transition-colors bg-slate-950 rounded-xl border border-slate-800"
                onClick={() => {
                  if(athlete.status === 'Active') onArchive(athlete.id)
                  else onRestore(athlete.id)
                }}
            >
              {athlete.status === 'Active' ? <Minus className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            </Button>
          </div>
      </td>
    </tr>
  );
})

export function CoachDashboardClient({
  profile,
  user,
  processedRoster,
  topProblems,
  teamIds,
  myTeams,
  pendingRequests,
  squadTrends = []
}: CoachDashboardClientProps) {
  const [isCopying, setIsCopying] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null)
  const [lockerCode, setLockerCode] = useState<string | null>(profile?.locker_code || null)
  const [connectionCode, setConnectionCode] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [rosterView, setRosterView] = useState<'Active' | 'Archived'>('Active')
  const [rosterLimit, setRosterLimit] = useState(15)
  const [origin, setOrigin] = useState('')
  const router = useRouter()

  const filteredRoster = useMemo(() => {
    return processedRoster.filter(a => a.status === rosterView)
  }, [processedRoster, rosterView])

  const visibleRoster = useMemo(() => {
    return filteredRoster.slice(0, rosterLimit)
  }, [filteredRoster, rosterLimit])

  const inviteToken = myTeams?.[0]?.invite_code
  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const inviteLink = inviteToken ? `${origin || 'https://creeda.performance.com'}/join/${inviteToken}` : ''

  const squadStats = useMemo(() => {
    const total = processedRoster.length || 1
    const avgReadiness = Math.round(processedRoster.reduce((acc, curr) => acc + (curr.readiness || 0), 0) / total)
    return {
        avgReadiness,
        readyCount: processedRoster.filter(a => (a.readiness || 0) >= 75).length,
        cautionCount: processedRoster.filter(a => (a.readiness || 0) >= 40 && (a.readiness || 0) < 75).length,
        criticalCount: processedRoster.filter(a => (a.readiness || 0) < 40).length
    }
  }, [processedRoster])

  const scrollToForm = useCallback(() => {
    setShowAddForm(true)
    setTimeout(() => {
      document.getElementById('add-athlete-section')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        const link = inviteToken ? `${window.location.origin}/join/${inviteToken}` : `${origin}/join/${inviteToken}`;
        await navigator.clipboard.writeText(link)
        setIsCopying(true)
        toast.success("Link Copied", { description: "Invite link copied to clipboard." })
        setTimeout(() => setIsCopying(false), 2000)
      }
    } catch (err) {
      toast.error("Failed to copy", { description: "Please copy the link manually." })
    }
  }, [inviteToken, origin]);

  const handleWhatsAppInvite = useCallback(() => {
    const link = inviteToken ? `${origin}/join/${inviteToken}` : inviteLink;
    const message = encodeURIComponent(`Hi! Join our squad on Creeda to track our readiness and recovery. Use this link: ${link}`)
    window.open(`https://wa.me/?text=${message}`, '_blank')
  }, [inviteLink, inviteToken, origin]);

  const handleViewAnalytics = useCallback((athleteId: string) => {
    router.push(`/coach/analytics?athlete=${athleteId}`)
  }, [router]);

  const handleGetLockerCode = useCallback(async () => {
    const res = await getOrCreateLockerCode()
    if (res.error) toast.error(res.error)
    else {
      setLockerCode(res.token || null)
      toast.success("Access Code Verified", { description: "This is your permanent connection code." })
    }
  }, []);

  const handleCopyCode = useCallback(async () => {
    if (!lockerCode) return
    try {
      await navigator.clipboard.writeText(lockerCode)
      toast.success("Code Copied", { description: "Access code copied to clipboard." })
    } catch (err) {
      toast.error("Failed to copy", { description: "Please copy the code manually." })
    }
  }, [lockerCode]);

  const handleConnect = useCallback(async () => {
    if (connectionCode.length !== 6) {
      toast.error("Invalid Code", { description: "Access Code must be 6 digits." })
      return
    }
    setIsConnecting(true)
    const res = await useLockerCode(connectionCode)
    setIsConnecting(false)
    if (res.error) toast.error(res.error)
    else {
      setConnectionCode('')
      toast.success("Connected!", { description: `Successfully linked with ${res.targetName}.` })
      router.refresh()
    }
  }, [connectionCode, router]);

  const handleArchive = useCallback(async (athleteId: string) => {
    const res = await archiveAthlete(athleteId, teamIds[0])
    if (res.error) toast.error(res.error)
    else toast.success("Athlete Moved", { description: "Athlete moved to the archived roster." })
  }, [teamIds]);

  const handleRemove = useCallback(async (athleteId: string) => {
    if (!window.confirm("Are you sure you want to permanently remove this athlete from your squad?")) return
    const res = await removeAthlete(athleteId, teamIds[0])
    if (res.error) toast.error(res.error)
    else toast.success("Athlete Removed", { description: "Athlete has been permanently removed from your roster." })
  }, [teamIds]);

  const handleRestore = useCallback(async (athleteId: string) => {
    const res = await restoreAthlete(athleteId, teamIds[0])
    if (res.error) toast.error(res.error)
    else toast.success("Athlete Restored", { description: "Athlete moved back to Active Squad." })
  }, [teamIds]);

  const handleApproveRequest = useCallback(async (requestId: string, athleteId: string) => {
    if (!teamIds?.[0]) {
      toast.error("No active squad found for approval.")
      return
    }
    setActiveRequestId(requestId)
    const res = await approveConnectionRequest(requestId, athleteId, user.id, teamIds[0])
    setActiveRequestId(null)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success("Request Approved", { description: "Athlete is now added to your active squad." })
    router.refresh()
  }, [teamIds, user?.id, router])

  const handleDenyRequest = useCallback(async (requestId: string) => {
    setActiveRequestId(requestId)
    const res = await denyConnectionRequest(requestId)
    setActiveRequestId(null)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success("Request Declined", { description: "Connection request has been denied." })
    router.refresh()
  }, [router])

  return (
    <DashboardLayout type="coach" user={profile || { full_name: user?.email }}>
      <div className="space-y-12 pb-20">
        {/* Header */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-12 border-b border-slate-800">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white leading-none">
              Coach Dashboard
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-3 flex items-center gap-2">
              Management Portal <ChevronRight className="h-4 w-4 text-primary" /> {profile?.full_name}
            </p>
          </div>

          <div className="flex items-center gap-4">
             <Card className="bg-slate-900 border-slate-800 shadow-xl px-8 py-4 rounded-2xl border">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-2">Team Size</p>
                <p className="text-2xl font-bold text-white leading-none">
                  {processedRoster.filter(a => a.status === 'Active').length} 
                  <span className="text-slate-500 text-sm font-medium ml-2 uppercase">Athletes</span>
                </p>
             </Card>
             <form action="/auth/signout" method="post">
                <Button
                   type="submit"
                   variant="ghost"
                   className="h-14 px-6 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-400/10 font-bold uppercase tracking-wider text-[10px] flex items-center gap-3 transition-all"
                >
                   <LogOut className="h-4 w-4" />
                   Sign Out
                </Button>
              </form>
          </div>
        </section>

        {/* Alerts section */}
        <section className="space-y-6">
           <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">Active Alerts</h2>
              <p className="text-xs font-medium text-slate-500 mt-2">Critical performance deviations requiring attention.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topProblems.length === 0 ? (
                <Card className="col-span-full py-16 bg-slate-900 border-2 border-dashed border-slate-800 text-center rounded-3xl">
                   <CheckCircle2 className="h-12 w-12 text-slate-800 mx-auto mb-4" />
                   <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">No critical alerts detected</p>
                </Card>
              ) : (
                topProblems.map(athlete => (
                   <Card key={athlete.id} className={`bg-slate-900 border rounded-3xl p-6 shadow-xl ${athlete.priority === 'Critical' ? 'border-red-500/40' : 'border-orange-500/40'}`}>
                      <div className="flex items-center gap-5 mb-6">
                         <div className="h-14 w-14 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 shadow-sm">
                            {athlete.avatar ? <img src={athlete.avatar} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center font-bold text-slate-700 text-lg uppercase">{athlete.name[0]}</div>}
                         </div>
                          <div>
                            <p className="text-base font-bold text-white tracking-tight leading-none mb-2">{athlete.name}</p>
                            <div className="text-[8px] font-bold px-2 py-1 rounded-md uppercase underline decoration-primary/50 text-slate-400">
                              READINESS: {athlete.readiness}%
                            </div>
                          </div>
                      </div>
                      <div className="space-y-4">
                         <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 min-h-[110px]">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">Status</p>
                             <div className={`px-2 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider inline-block mb-2 ${
                               athlete.status === 'TRAIN' ? 'bg-green-500' : 
                               athlete.status === 'MODIFY' ? 'bg-orange-500' : 
                               'bg-red-500'
                             }`}>
                                {athlete.status}
                             </div>
                             <p className="text-xs font-medium text-slate-300 leading-relaxed italic">
                                “{athlete.action}”
                             </p>
                             <p className="text-[10px] font-bold text-slate-600 uppercase mt-2 tracking-tight">{athlete.reason}</p>
                         </div>
                         <Button
                            onClick={() => handleViewAnalytics(athlete.id)}
                            className="w-full h-12 bg-slate-800 border-slate-700 hover:bg-slate-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl"
                         >
                            View Analytics
                            <ChevronRight className="h-3 w-3 ml-2" />
                         </Button>
                      </div>
                   </Card>
                ))
              )}
           </div>
        </section>

        {/* Team Summary */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-8">
           <Card className="md:col-span-3 bg-slate-900 rounded-3xl p-10 border border-slate-800 shadow-xl overflow-hidden">
              <div className="space-y-6">
                 <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-950 rounded-full border border-slate-800">
                    <Brain className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Squad Summary</span>
                 </div>
                 <h3 className="text-4xl font-bold tracking-tight text-white leading-tight">
                    Team Readiness: {squadStats.avgReadiness}%
                 </h3>
                 <p className="text-slate-400 font-medium leading-relaxed max-w-2xl">
                    {squadStats.avgReadiness >= 70 
                      ? 'Overall capacity is excellent. Clearing squad for high-intensity training.' 
                      : 'Team recovery markers suggest caution. Consider reducing technical load for athletes with lower readiness.'}
                 </p>
                 <div className="flex flex-wrap gap-5 pt-2">
                    <div className="px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl">
                       <p className="text-2xl font-bold text-emerald-500">{squadStats.readyCount}</p>
                       <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Ready</p>
                    </div>
                    <div className="px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl">
                       <p className="text-2xl font-bold text-orange-500">{squadStats.cautionCount}</p>
                       <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Caution</p>
                    </div>
                    <div className="px-6 py-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                       <p className="text-2xl font-bold text-red-500">{squadStats.criticalCount}</p>
                       <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Critical</p>
                    </div>
                 </div>
              </div>

              <div className="mt-10 pt-10 border-t border-slate-800">
                 <div className="flex items-center gap-3 mb-6">
                   <Scale className="h-4 w-4 text-primary" />
                   <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Systemic Limiters</p>
                 </div>
                 <SquadLimiterHeatmap roster={processedRoster} />
              </div>
           </Card>

           <Card className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between shadow-xl">
              <div>
                 <h4 className="text-lg font-bold text-white tracking-tight mb-4">Availability</h4>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active</p>
                       <p className="text-lg font-bold text-white">{processedRoster.filter(a => a.status === 'Active').length}</p>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg Readiness</p>
                       <p className="text-lg font-bold text-primary">{squadStats.avgReadiness}%</p>
                    </div>
                 </div>
              </div>
              <Button className="w-full mt-8 rounded-xl h-14 bg-slate-800 border-slate-700 hover:bg-slate-700 font-bold text-[10px] uppercase tracking-wider text-white">
                Full Squad View
              </Button>
           </Card>
        </section>

        {/* Trends */}
        <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-xl overflow-hidden">
           <div className="flex flex-col md:flex-row items-center justify-between mb-10">
              <div>
                 <h3 className="text-2xl font-bold text-white tracking-tight">Performance Trends</h3>
                 <p className="text-xs font-medium text-slate-500 mt-2">7-Day Squad Readiness signals.</p>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-950 rounded-xl border border-slate-800">
                 <div className="h-2 w-2 rounded-full bg-primary" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Average Readiness %</span>
              </div>
           </div>
           <div className="h-[300px]">
              <SquadTrendsChart data={squadTrends} />
           </div>
        </section>

        {/* Management Area */}
        <div className="space-y-12">
            <Card className="bg-slate-900 border border-slate-800 rounded-[2rem] p-10 text-white shadow-xl">
              <div className="flex flex-col lg:flex-row gap-16">
                <div className="flex-1 space-y-10">
                  <div>
                    <div className="flex items-center gap-5 mb-6">
                      <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                        <ShieldCheck className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-2xl font-bold tracking-tight">Team Access</h4>
                        <p className="text-xs font-medium text-slate-500 mt-1">Manage connection codes and onboarding.</p>
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-md">
                      Share your unique access code with athletes to connect them to your dashboard or use the invite link below.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Permanent Access Code</p>
                    <div className="flex gap-4 items-center">
                      <div className="flex-1 h-20 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center font-bold text-4xl tracking-widest text-primary shadow-inner">
                        {lockerCode || '------'}
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={handleCopyCode}
                          variant="outline"
                          className="h-20 w-20 rounded-2xl bg-slate-950 border-slate-800 hover:bg-slate-800"
                        >
                          <Copy className="h-6 w-6 text-slate-400" />
                        </Button>
                        <Button
                          onClick={handleGetLockerCode}
                          variant="outline"
                          className="h-20 w-20 rounded-2xl bg-slate-950 border-slate-800 hover:bg-slate-800"
                        >
                          <RotateCcw className="h-6 w-6 text-slate-400" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleWhatsAppInvite}
                      className="h-12 px-8 rounded-xl bg-india-green text-white font-bold uppercase tracking-wider text-[10px] shadow-lg flex items-center gap-3 transition-all active:scale-95"
                    >
                      <PlusCircle className="h-5 w-5" />
                      Send WhatsApp Invite
                    </Button>
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      className="h-12 px-8 rounded-xl bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]"
                    >
                      {isCopying ? <Check className="h-4 w-4 mr-2 text-india-green" /> : <Copy className="h-4 w-4 mr-2" />}
                      Copy Invite Link
                    </Button>
                  </div>
                </div>

                <Card className="lg:w-96 bg-slate-950 rounded-3xl p-8 border border-slate-800 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center gap-4 mb-5">
                      <Activity className="h-5 w-5 text-primary" />
                      <h5 className="text-lg font-bold tracking-tight">Connect Athlete</h5>
                    </div>
                    <p className="text-slate-500 text-xs font-medium leading-relaxed mb-8">
                       Enter an athlete's 6-digit access code to connect them to your dashboard.
                    </p>
                    <div className="space-y-4">
                      <Input 
                        placeholder="CODE" 
                        value={connectionCode}
                        onChange={(e) => setConnectionCode(e.target.value.toUpperCase())}
                        className="h-16 bg-slate-900 border-slate-800 text-white rounded-xl text-center font-bold tracking-[0.3em] text-2xl focus:border-primary/50 transition-all placeholder:text-slate-700"
                        maxLength={6}
                      />
                      <Button
                        onClick={handleConnect}
                        disabled={isConnecting || connectionCode.length !== 6}
                        className="w-full h-16 rounded-xl bg-primary text-white font-bold uppercase tracking-wider text-[11px] disabled:opacity-50"
                      >
                        {isConnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Connect Athlete"}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-8 flex items-center gap-3 px-5 py-3 bg-india-green/5 rounded-xl border border-india-green/20">
                    <ShieldCheck className="h-4 w-4 text-india-green" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-india-green">Secure Connection</span>
                  </div>
                </Card>
              </div>
            </Card>

            {showAddForm && (
              <div id="add-athlete-section" className="animate-in fade-in slide-in-from-top-8 duration-500">
                 <AddAthleteForm teamId={teamIds[0]} />
              </div>
            )}

            {pendingRequests.length > 0 && (
              <Card className="bg-slate-900 border border-slate-800 rounded-[2rem] p-10 shadow-xl">
                <div className="flex items-center justify-between gap-6 mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">Pending Requests</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">Review new connection attempts.</p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border border-primary/20 px-4 py-1 text-[10px] font-bold uppercase tracking-wider">
                    {pendingRequests.length} Pending
                  </Badge>
                </div>

                <div className="space-y-4">
                  {pendingRequests.map((request: any) => {
                    const athlete = Array.isArray(request?.athlete) ? request.athlete[0] : request?.athlete
                    const athleteName = athlete?.full_name || 'Unnamed Athlete'
                    const athleteUsername = athlete?.username ? `@${athlete.username}` : '@unknown'
                    const isProcessing = activeRequestId === request.id

                    return (
                      <div
                        key={request.id}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-5 p-5 rounded-2xl bg-slate-950 border border-slate-800"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center">
                            {athlete?.avatar_url
                              ? <img src={athlete.avatar_url} alt="" className="h-full w-full object-cover" />
                              : <span className="text-sm font-bold text-slate-500">{athleteName[0]}</span>
                            }
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white uppercase tracking-tight">{athleteName}</p>
                            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">{athleteUsername}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Button
                            onClick={() => handleDenyRequest(request.id)}
                            disabled={isProcessing}
                            variant="outline"
                            className="h-11 px-6 rounded-xl border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-bold text-[10px] uppercase tracking-wider"
                          >
                            Deny
                          </Button>
                          <Button
                            onClick={() => handleApproveRequest(request.id, request.athlete_id)}
                            disabled={isProcessing}
                            className="h-11 px-6 rounded-xl bg-india-green text-white font-bold text-[10px] uppercase tracking-wider"
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* Roster Card */}
            <Card className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-xl">
               <div className="px-10 py-10 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">Squad Roster</h3>
                    <div className="flex gap-8 mt-4">
                      <button
                        onClick={() => setRosterView('Active')}
                        className={`text-[10px] font-bold uppercase tracking-widest pb-2 border-b-2 transition-all ${rosterView === 'Active' ? 'text-primary border-primary' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                      >
                        Active ({processedRoster.filter(a => a.status === 'Active').length})
                      </button>
                      <button
                        onClick={() => setRosterView('Archived')}
                        className={`text-[10px] font-bold uppercase tracking-widest pb-2 border-b-2 transition-all ${rosterView === 'Archived' ? 'text-primary border-primary' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                      >
                        Archived ({processedRoster.filter(a => a.status === 'Archived').length})
                      </button>
                    </div>
                  </div>
                  <Button onClick={scrollToForm} className="h-12 px-8 rounded-xl bg-primary text-white font-bold text-[10px] uppercase tracking-wider shadow-lg active:scale-95 flex items-center gap-2">
                    Add Athlete <PlusCircle className="h-4 w-4" />
                  </Button>
               </div>

               <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800">
                        <th className="text-left py-6 px-10 text-[10px] font-bold uppercase tracking-widest text-slate-500">Athlete</th>
                        <th className="text-center py-6 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Readiness</th>
                        <th className="text-left py-6 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Training Status</th>
                        <th className="text-left py-6 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Intelligence</th>
                        <th className="text-right py-6 px-10 text-[10px] font-bold uppercase tracking-widest text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {visibleRoster.map((athlete) => (
                        <AthleteRosterRow 
                          key={athlete.id}
                          athlete={athlete}
                          onArchive={handleArchive}
                          onRestore={handleRestore}
                          onRemove={handleRemove}
                          onViewAnalytics={handleViewAnalytics}
                        />
                      ))}
                    </tbody>
                  </table>
               </div>

               {filteredRoster.length > rosterLimit && (
                  <div className="p-8 border-t border-slate-800 text-center">
                     <Button 
                       variant="ghost" 
                       onClick={() => setRosterLimit(prev => prev + 25)}
                       className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-primary transition-all"
                     >
                        Show More Athletes (+25)
                     </Button>
                  </div>
               )}
            </Card>
        </div>
      </div>

      <div className="mt-16 mb-8 px-6 text-center pb-12">
        <p className="text-[10px] font-medium text-slate-600 uppercase tracking-widest leading-relaxed max-w-2xl mx-auto italic">
          Disclaimer: CREEDA provides performance data based on athlete inputs. All insights are advisory. Performance decisions remain the responsibility of the coach.
        </p>
      </div>
    </DashboardLayout>
  )
}
