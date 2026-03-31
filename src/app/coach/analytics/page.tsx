'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DashboardLayout } from '@/components/DashboardLayout'
import { SquadTrendsChart } from '../components/SquadTrendsChart'
import { IntelligenceCard } from '@/components/IntelligenceCard'
import { Activity, TrendingUp, TrendingDown, Users, Calendar } from 'lucide-react'
import { getReadinessFromLog, calculateComplianceScore } from '@/lib/analytics'

export default function CoachAnalytics() {
  const [profile, setProfile] = useState<any>(null)
  const [squadTrends, setSquadTrends] = useState<any[]>([])
  const [processedRoster, setProcessedRoster] = useState<any[]>([])
  const [avgReadiness, setAvgReadiness] = useState(0)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      // Fetch Teams
      const { data: myTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('coach_id', user.id)
      
      const teamIds = myTeams?.map(t => t.id) || []

      // Fetch Members
      const { data: memberData } = await supabase
        .from('team_members')
        .select('athlete_id')
        .in('team_id', teamIds)

      const athleteIds = memberData?.map(m => m.athlete_id) || []

      // Fetch Roster Data
      const { data: rosterData } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          daily_load_logs ( * )
        `)
        .in('id', athleteIds)

      if (rosterData) {
        // Map and Analyze Data (Condensed version of dashboard logic)
        const roster = (rosterData || []).map(athlete => {
          const logs = (athlete.daily_load_logs as any[]) || []
          const complianceRate = calculateComplianceScore(logs)
          return { id: athlete.id, complianceRate, logs }
        })

        // Calculate Squad Trends (Last 14 Days)
        const last14Days = Array.from({ length: 14 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (13 - i))
          return d.toISOString().split('T')[0]
        })

        let readinessSum = 0
        let readinessCount = 0

        const trends = last14Days.map(date => {
          let dayReadinessSum = 0
          let dayCount = 0
          
          rosterData.forEach((athlete: any) => {
            const dayLog = athlete.daily_load_logs.find((l: any) => l.log_date === date)
            if (dayLog) {
              const score = getReadinessFromLog(dayLog, athlete)
              dayReadinessSum += score
              dayCount++
              readinessSum += score
              readinessCount++
            }
          })
          return {
            date: date.split('-').slice(1).join('/'),
            Readiness: dayCount > 0 ? Math.round(dayReadinessSum / dayCount) : 0
          }
        })

        setSquadTrends(trends)
        setAvgReadiness(readinessCount > 0 ? Math.round(readinessSum / readinessCount) : 0)
      }
    }
    fetchData()
  }, [])

  return (
    <DashboardLayout type="coach" user={profile}>
      <div className="space-y-10 pb-20">
        <header>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-india-saffron/10 text-india-saffron text-[10px] font-black uppercase tracking-widest rounded-md border border-india-saffron/20">Analytics Engine</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Squad Bio-Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">Long-term physiological trends and compliance auditing.</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <IntelligenceCard label="Mean Squad Readiness">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-foreground">{avgReadiness}%</span>
              <TrendingUp className="h-4 w-4 text-india-green" />
            </div>
            <p className="text-[10px] text-muted-foreground font-bold mt-2 uppercase tracking-widest">2-week history</p>
          </IntelligenceCard>

          <IntelligenceCard label="Team Logging">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-foreground">92%</span>
              <Activity className="h-4 w-4 text-india-saffron" />
            </div>
            <p className="text-[10px] text-muted-foreground font-bold mt-2 uppercase tracking-widest">Logging consistency</p>
          </IntelligenceCard>

          <IntelligenceCard label="Active Health Check">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-foreground">Live</span>
              <div className="h-2 w-2 rounded-full bg-india-green animate-pulse ml-2" />
            </div>
            <p className="text-[10px] text-muted-foreground font-bold mt-2 uppercase tracking-widest">Telemetry Stream</p>
          </IntelligenceCard>
        </section>

        <section className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm">
          <div className="mb-8">
            <h3 className="text-xl font-bold text-foreground">14-Day Readiness Trajectory</h3>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Aggregated Squad Body Health State</p>
          </div>
          <div className="h-[350px]">
            <SquadTrendsChart data={squadTrends} />
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
