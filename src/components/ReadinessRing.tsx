'use client'

import { useMemo, memo } from 'react'
import { motion } from 'framer-motion'
import { Zap, Activity, ShieldAlert, Loader2 } from 'lucide-react'

interface ReadinessRingProps {
  score: number;         
  status?: string;       
  isLoading?: boolean;
}

export const ReadinessRing = memo(function ReadinessRing({ 
  score, 
  status = 'Syncing',
  isLoading = false
}: ReadinessRingProps) {
  
  const statusColor = useMemo(() => {
    if (score >= 80) return 'text-emerald-500'; 
    if (score >= 60) return 'text-orange-500';
    return 'text-red-500';
  }, [score]);

  const dashOffset = 283 - (283 * score) / 100;

  if (isLoading) {
    return (
      <div className="relative h-64 w-64 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="relative group">
      <svg className="h-64 w-64 transform -rotate-90">
        <circle
          cx="128"
          cy="128"
          r="90"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="12"
          fill="transparent"
        />
        <motion.circle
          cx="128"
          cy="128"
          r="90"
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          strokeDasharray="565.48"
          initial={{ strokeDashoffset: 565.48 }}
          animate={{ strokeDashoffset: 565.48 - (565.48 * score / 100) }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
          className={statusColor}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-2 mb-1">
           {score >= 80 ? (
             <Zap className="h-4 w-4 text-emerald-500" />
           ) : score >= 60 ? (
             <Activity className="h-4 w-4 text-orange-500" />
           ) : (
             <ShieldAlert className="h-4 w-4 text-red-500" />
           )}
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Status</span>
        </div>
        
        <div className="flex items-baseline">
          <span className="text-6xl font-bold text-white tracking-tight">
            {score}
          </span>
          <span className="text-xl text-slate-500 ml-1 ml-1">%</span>
        </div>
        
        <div className="mt-3 px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
           <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
              {status}
           </span>
        </div>
      </div>
    </div>
  )
});
