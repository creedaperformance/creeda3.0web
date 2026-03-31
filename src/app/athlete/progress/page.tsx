'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Activity, ShieldAlert, CheckCircle2 } from 'lucide-react'

export default function ProgressScreen() {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({ weeklySessions: 0, recoveryDelta: 0 })

  useEffect(() => {
    async function fetchTrendData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: logs } = await supabase
        .from('daily_load_logs')
        .select('*')
        .eq('athlete_id', user.id)
        .order('created_at', { ascending: false })
        .limit(14)

      if (logs) {
        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
        let checkDate = new Date(todayStr);
        checkDate.setDate(checkDate.getDate() - 7);
        const thisWeekLogs = logs.filter(l => new Date(l.log_date.split('T')[0]) >= checkDate);
        
        let lastWeekCheck = new Date(checkDate);
        lastWeekCheck.setDate(lastWeekCheck.getDate() - 7);
        const lastWeekLogs = logs.filter(l => {
          const d = new Date(l.log_date.split('T')[0]);
          return d >= lastWeekCheck && d < checkDate;
        });

        const weeklySessions = thisWeekLogs.length;

        const calcAvgScore = (arr: any[]) => {
          if (arr.length === 0) return 3; // Neutral fallback
          let total = 0;
          arr.forEach(l => {
             const sleep = l.sleep_quality === 'Excellent' ? 5 : l.sleep_quality === 'Good' ? 4 : l.sleep_quality === 'Okay' ? 3 : 2;
             const energy = l.energy_level === 'High' ? 5 : l.energy_level === 'Moderate' ? 3 : 2;
             const soreness = l.muscle_soreness === 'None' ? 5 : l.muscle_soreness === 'Low' ? 4 : l.muscle_soreness === 'Moderate' ? 3 : 2;
             total += ((sleep + energy + soreness) / 3);
          });
          return total / arr.length;
        }

        const recentAvg = calcAvgScore(thisWeekLogs);
        const olderAvg = lastWeekLogs.length > 0 ? calcAvgScore(lastWeekLogs) : recentAvg - 0.2;

        const delta = ((recentAvg - olderAvg) / olderAvg) * 100;
        setStats({ weeklySessions, recoveryDelta: Math.round(delta) });
      }
      setIsLoading(false)
    }

    fetchTrendData()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#04070A] flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-t-2 border-[#10B981] border-r-2 border-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#04070A] text-white flex flex-col pt-12 pb-32 px-6 relative overflow-hidden font-sans">
      <div className={`absolute top-0 right-1/2 translate-x-1/2 w-96 h-96 bg-[#0A84FF]/10 blur-[120px] rounded-full pointer-events-none opacity-60`} />

      <header className="mb-10 text-center relative z-10 flex flex-col items-center">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Weekly Summary</h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mt-1">Simplicity Over Noise</p>
      </header>

      <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-start relative z-10 space-y-4">
        
        {/* Weekly Volume Summary */}
        <motion.div 
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-md"
        >
          <div className="flex justify-between items-center mb-4">
             <span className="text-[10px] font-black uppercase tracking-widest text-[#0A84FF]">Training Volume</span>
             {stats.weeklySessions >= 4 ? <TrendingUp className="text-[#10B981] w-4 h-4"/> : <Minus className="text-[#0A84FF] w-4 h-4"/>}
          </div>
          <h3 className="text-[2rem] font-black text-white leading-none tracking-tighter">You trained {stats.weeklySessions} times this week</h3>
          {stats.weeklySessions >= 3 && (
            <p className="text-[10px] uppercase font-bold text-[#10B981] mt-3 tracking-widest bg-[#10B981]/10 self-start inline-block px-3 py-1 rounded-full border border-[#10B981]/20">
              You're on the right track
            </p>
          )}
        </motion.div>

        {/* Recovery Trend Summary */}
        <motion.div 
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.1 }}
           className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-md"
        >
          <div className="flex justify-between items-center mb-4">
             <span className="text-[10px] font-black uppercase tracking-widest text-[#0A84FF]">Adaptation</span>
             {stats.recoveryDelta > 0 ? <TrendingUp className="text-[#10B981] w-4 h-4"/> : stats.recoveryDelta < 0 ? <TrendingDown className="text-[#FF9933] w-4 h-4"/> : <Minus className="text-[#0A84FF] w-4 h-4"/>}
          </div>
          <h3 className="text-[2rem] font-black text-white leading-none tracking-tighter">
             Recovery {stats.recoveryDelta > 0 ? 'improved' : stats.recoveryDelta < 0 ? 'dropped' : 'remained stable'} by {Math.abs(stats.recoveryDelta)}%
          </h3>
          <p className="text-[10px] uppercase font-bold text-white/50 mt-3 tracking-widest">
            {stats.recoveryDelta > 0 ? "Consistency is generating positive adaptations." : "Monitor fatigue accumulation closely."}
          </p>
        </motion.div>

      </div>
    </div>
  )
}
