import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Activity, CalendarDays, TrendingUp, AlertTriangle } from 'lucide-react'
import { PrintButton } from '@/components/ui/print-button'
import { DashboardLayout } from '@/components/DashboardLayout'
import { calculateLoadScore, getReadinessFromLog } from '@/lib/analytics'
import { getRoleHomeRoute, isAppRole } from '@/lib/auth_utils'

export default async function MonthlyReportPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile && isAppRole(profile.role) && profile.role !== 'athlete') {
      redirect(getRoleHomeRoute(profile.role))
  }

  // 0. Fetch Onboarding Diagnostics
  const { data: diagnostic } = await supabase
    .from('diagnostics')
    .select('*')
    .eq('athlete_id', user.id)
    .single()

  // 1. Calculate 28 day window
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - 28)

  // 2. Fetch the last 28 days of logs
  const { data: logs, error: logsError } = await supabase
    .from('daily_load_logs')
    .select('*')
    .eq('athlete_id', user.id)
    .gte('log_date', startDate.toISOString().split('T')[0])
    .lte('log_date', endDate.toISOString().split('T')[0])
    .order('log_date', { ascending: true })

  // Data processing logic
  const reportedDays = logs ? logs.length : 0;
  const consistencyScore = Math.round((reportedDays / 28) * 100);
  
  let aggregateLoad = 0;
  let totalReadiness = 0;
  const warnings: string[] = [];
  
  let poorSleepConsecutive = 0;
  let highestPain = 0;
  const painLocations = new Set<string>();

  if (logs && reportedDays > 0) {
      logs.forEach(log => {
          // Compute derived values
          const load = calculateLoadScore(log.training_duration, log.session_rpe)
          const readiness = getReadinessFromLog(log, diagnostic)
          
          aggregateLoad += load;
          totalReadiness += readiness;
          
          // Warnings: Sleep loop
          if (log.sleep_hours === '<5' || log.sleep_quality <= 2) {
              poorSleepConsecutive++;
              if (poorSleepConsecutive === 3) warnings.push("Sustained Sleep Debt: Poor sleep or <5 hours for 3+ consecutive days detected.");
          } else {
              poorSleepConsecutive = 0;
          }
          
          // Warnings: Pain
          if (log.current_pain_level > highestPain) highestPain = log.current_pain_level;
          if (log.current_pain_level > 6 && !warnings.some(w => w.includes("High Pain Event"))) {
              warnings.push(`High Pain Event: Severity ${log.current_pain_level}/10 recorded.`);
          }
          if (log.pain_location && Array.isArray(log.pain_location)) {
              log.pain_location.forEach((loc: string) => painLocations.add(loc));
          }
      })
      
      if (painLocations.size > 0) {
         warnings.push(`Chronic Loading Areas: ${Array.from(painLocations).join(', ')}`);
      }
  }

  const averageReadiness = reportedDays > 0 ? Math.round(totalReadiness / reportedDays) : 0;
  const macroLoadAU = Math.round(aggregateLoad || 0);

  // Warnings: Consistency
  if (consistencyScore < 60) {
      warnings.push(`Low Compliance: Logged only ${consistencyScore}% of days. Consistency is key for accurate physiological modeling.`);
  }

  // Render logic
  return (
    <DashboardLayout type="athlete" user={profile}>
      <div className="min-h-screen pb-24 font-sans print:bg-card print:text-black text-foreground">
        
        {/* Hide controls when printing */}
        <div className="max-w-4xl mx-auto p-4 print:hidden flex justify-between items-center mb-8">
          <PrintButton />
        </div>

        <div className="max-w-4xl mx-auto px-4">
          {/* Report Header */}
          <div className="border-b-4 border-primary pb-6 mb-8 flex justify-between items-end break-inside-avoid text-foreground">
             <div>
                <div className="flex items-center gap-3 shrink-0 mb-4">
                  <img src="/logo.png" alt="Creeda Flame Logo" className="h-10 w-auto object-contain shrink-0 brightness-0 invert" />
                  <img src="/creeda-performance-logo.png" alt="Creeda Performance Text Logo" className="h-6 sm:h-7 w-auto object-contain shrink-0 brightness-0 invert" />
                </div>
                <h1 className="text-4xl font-black uppercase tracking-tight mb-1">Performance Report</h1>
                <p className="text-xl font-medium text-muted-foreground print:text-gray-600">CREEDA Body Science</p>
             </div>
             <div className="text-right">
                <p className="text-2xl font-bold uppercase">{profile?.full_name}</p>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1 print:text-gray-500">
                  {new Date(startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - {new Date(endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
             </div>
          </div>

          {reportedDays === 0 ? (
             <div className="text-center py-20 bg-muted rounded-2xl border border-dashed border-border">
                <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-bold text-foreground">Insufficient Data</h2>
                <p className="text-muted-foreground mt-2 max-w-sm mx-auto">A Monthly Report requires at least 1 daily log in the past 28 days to generate actionable intelligence.</p>
             </div>
          ) : (
            <div className="space-y-10">
              
              {/* KPI Row */}
              <div className="grid sm:grid-cols-3 gap-6 break-inside-avoid">
                 
                 {/* Average Readiness */}
                 <div className="bg-card rounded-2xl border border-border p-6 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center mb-4">
                       <Activity className="w-5 h-5 text-primary mr-2" />
                       <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Average Readiness</h3>
                    </div>
                    <div>
                       <span className={`text-6xl font-black ${averageReadiness >= 80 ? 'text-status-optimal' : averageReadiness >= 60 ? 'text-status-warning' : 'text-status-critical'}`}>
                          {averageReadiness}
                       </span>
                       <span className="text-sm font-bold opacity-60 ml-1">/100</span>
                    </div>
                    <p className="text-xs font-semibold mt-4 text-muted-foreground text-pretty">Your body&apos;s ability to handle exercise (28-Day Average)</p>
                 </div>

                 {/* Macro Load */}
                 <div className="bg-card rounded-2xl border border-border p-6 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center mb-4">
                       <TrendingUp className="w-5 h-5 text-primary mr-2" />
                       <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Total Training Stress</h3>
                    </div>
                    <div>
                       <span className="text-5xl font-black text-foreground">{macroLoadAU}</span>
                       <span className="text-sm font-bold opacity-60 ml-2">Units (AU)</span>
                    </div>
                    <p className="text-xs font-semibold mt-4 text-muted-foreground text-pretty">Total stress put on your body during exercise over 28 days</p>
                 </div>

                 {/* Consistency */}
                 <div className="bg-muted rounded-2xl border border-border p-6 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center mb-4">
                       <CalendarDays className="w-5 h-5 text-primary mr-2" />
                       <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Logging Consistency</h3>
                    </div>
                    <div>
                       <span className={`text-5xl font-black ${consistencyScore >= 80 ? 'text-primary' : 'text-status-warning'}`}>{consistencyScore}%</span>
                    </div>
                    <p className="text-xs font-semibold mt-4 text-muted-foreground text-pretty">Logged {reportedDays} out of 28 Days</p>
                 </div>
              </div>

              {/* Module 3: Active Warning Signals */}
              <div className="break-inside-avoid">
                 <h3 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center border-b border-border pb-2 text-foreground">
                   <AlertTriangle className="w-5 h-5 text-status-critical mr-3" />
                    Automatic Warning Signals
                 </h3>
                 
                 {warnings.length === 0 ? (
                    <div className="bg-card rounded-xl border border-border p-6 text-center">
                       <p className="font-bold text-status-optimal">No chronic warnings detected in this 28-day cycle.</p>
                    </div>
                 ) : (
                    <div className="grid gap-3">
                       {warnings.map((warning, idx) => (
                          <div key={idx} className="bg-status-critical/10 border border-status-critical/20 rounded-xl p-4 flex">
                             <div className="w-2 h-full bg-status-critical rounded-full mr-4 shrink-0" />
                             <p className="font-semibold text-status-critical">
                               {warning}
                             </p>
                          </div>
                       ))}
                    </div>
                 )}
              </div>

              {/* Table Reference */}
              <div className="mt-12 break-inside-avoid">
                 <h3 className="text-lg font-black uppercase tracking-widest mb-4 border-b border-border pb-2 text-foreground">28-Day Raw Data Log</h3>
                 <div className="rounded-xl border border-border overflow-hidden text-sm bg-card">
                    <table className="w-full text-left">
                       <thead className="bg-muted text-muted-foreground font-bold uppercase text-[10px] tracking-wider">
                          <tr>
                             <th className="p-3 border-b border-border">Date</th>
                             <th className="p-3 border-b border-border">Readiness</th>
                             <th className="p-3 border-b border-border">Activity</th>
                             <th className="p-3 border-b border-border">Load</th>
                             <th className="p-3 border-b border-border">Pain</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-border">
                          {logs?.map((log: any) => (
                             <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                                <td className="p-3 font-semibold whitespace-nowrap text-foreground">
                                   {new Date(log.log_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                </td>
                                 <td className="p-3 font-bold text-foreground">
                                   {getReadinessFromLog(log, diagnostic)}
                                </td>
                                <td className="p-3 text-muted-foreground">
                                   {log.planned_training || 'Rest'}
                                </td>
                                <td className="p-3 font-bold text-foreground">
                                   {calculateLoadScore(log.training_duration, log.session_rpe)}
                                </td>
                                <td className="p-3">
                                   {log.current_pain_level > 0 ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-black bg-status-critical/10 text-status-critical border border-status-critical/20">
                                         {log.current_pain_level}/10
                                      </span>
                                   ) : (
                                      <span className="text-muted-foreground/30">-</span>
                                   )}
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>

              {/* Footer */}
              <div className="mt-16 pt-8 border-t border-border text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">
                 <p>Automated Report • CREEDA Body Science</p>
                 <p className="mt-1">Clinical Context Required for Interpretation</p>
              </div>

            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
