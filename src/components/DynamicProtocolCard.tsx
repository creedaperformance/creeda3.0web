'use client'

import { motion } from 'framer-motion'
import { Trophy, Activity, RotateCcw, Plane, ChevronRight, Zap } from 'lucide-react'

type ProtocolType = 'MATCH' | 'TRAINING' | 'RECOVERY' | 'TRAVEL';

interface DynamicProtocolCardProps {
  type: ProtocolType;
  title: string;
  subtitle: string;
  onClick: () => void;
  primary_action?: "Train" | "Recover" | "Modify" | "Rest";
  structured_explanation?: { factor: string; reason: string; priority: number }[];
  blocked_movements?: string[];
  focus_area?: string;
}

export function DynamicProtocolCard({ 
  type, 
  title, 
  subtitle, 
  onClick,
  primary_action = "Train",
  structured_explanation = [],
  blocked_movements = [],
  focus_area
}: DynamicProtocolCardProps) {
  const config = {
    MATCH: {
      icon: Trophy,
      color: '#3B82F6', // Electric Blue
      glow: 'rgba(59, 130, 246, 0.2)',
      label: 'Game Priority',
      actionColor: 'bg-blue-500'
    },
    TRAINING: {
      icon: Activity,
      color: '#F59E0B', // Tactical Amber
      glow: 'rgba(245, 158, 11, 0.2)',
      label: 'Daily Training',
      actionColor: 'bg-IndiaSaffron'
    },
    RECOVERY: {
      icon: RotateCcw,
      color: '#10B981', // Surgical Green
      glow: 'rgba(16, 185, 129, 0.2)',
      label: 'Body Recovery',
      actionColor: 'bg-IndiaGreen'
    },
    TRAVEL: {
      icon: Plane,
      color: '#6366F1', // Indigo
      glow: 'rgba(99, 102, 241, 0.2)',
      label: 'Travel Care',
      actionColor: 'bg-indigo-500'
    }
  };

  const { icon: Icon, color, glow, label, actionColor } = config[type];

  const getActionStyles = () => {
    switch(primary_action) {
      case 'Train': return 'bg-IndiaGreen shadow-[0_0_15px_rgba(46,125,50,0.4)]';
      case 'Recover': return 'bg-IndiaSaffron shadow-[0_0_15px_rgba(245,124,0,0.4)]';
      case 'Modify': return 'bg-india-red shadow-[0_0_15px_rgba(220,38,38,0.4)]';
      case 'Rest': return 'bg-zinc-700 shadow-[0_0_15px_rgba(32,32,32,0.4)]';
      default: return 'bg-zinc-500';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="relative p-7 rounded-[2.5rem] bg-card border border-border cursor-pointer overflow-hidden shadow-sm hover:border-border/80 active:scale-[0.99] group transition-all duration-300"
      style={{ boxShadow: `0 0 40px ${glow}` }}
    >
      {/* Background Icon Watermark */}
      <div className="absolute -top-4 -right-4 h-32 w-32">
        <Icon className="h-full w-full opacity-[0.03] rotate-12" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
             <div 
                className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-3 transition-transform"
                style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
             >
               <Icon className="h-7 w-7" style={{ color }} />
             </div>
             
             <div>
               <div className="flex items-center gap-2 mb-1">
                 <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color }}>{label}</span>
                 <Zap className="h-3 w-3 animate-pulse" style={{ color }} />
               </div>
               <div className="flex items-center gap-2">
                 <h3 className="text-xl font-black text-foreground leading-none uppercase tracking-tight">{title}</h3>
                 <div className={`px-2 py-0.5 rounded-md ${getActionStyles()} text-[8px] font-black text-white uppercase tracking-widest`}>
                    {primary_action}
                 </div>
               </div>
             </div>
          </div>

          <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center group-hover:bg-muted/60 transition-all border border-border/50">
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {/* V4.2 Actionable Intelligence Layer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="space-y-3">
             <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Decision Explanation</p>
             <div className="space-y-2">
               {structured_explanation.length > 0 ? structured_explanation.map((exp, i) => (
                 <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                   <div className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
                   <div className="space-y-0.5">
                     <p className="text-[9px] font-black uppercase tracking-widest text-foreground/80">{exp.factor}</p>
                     <p className="text-[10px] text-muted-foreground font-medium leading-tight">"{exp.reason}"</p>
                   </div>
                 </div>
               )) : (
                 <p className="text-[11px] font-medium text-muted-foreground leading-relaxed italic px-2">
                   "{subtitle}"
                 </p>
               )}
             </div>
          </div>

          <div className="space-y-4">
            {focus_area && (
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/30">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Physiological Focus</p>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-IndiaGreen/20 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-IndiaGreen" />
                  </div>
                  <p className="text-xs font-black text-foreground uppercase tracking-tighter">{focus_area}</p>
                </div>
              </div>
            )}

            {blocked_movements.length > 0 && (
              <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                <p className="text-[9px] font-black text-india-red uppercase tracking-[0.2em] mb-3 leading-none">Blocked Movements</p>
                <div className="flex flex-wrap gap-2">
                  {blocked_movements.map(m => (
                    <span key={m} className="px-2 py-1 bg-india-red/10 border border-india-red/20 rounded-lg text-[9px] font-black text-india-red uppercase tracking-tighter">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress/Urgency Indication */}
      <div className="mt-6 w-full h-[3px] bg-muted/50 rounded-full overflow-hidden">
        <motion.div 
          className="h-full" 
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  )
}
