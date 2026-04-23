'use client'

import { useState, useEffect } from 'react'
import { Target, CheckCircle2, ChevronRight, X, Loader2, Sparkles, Zap, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { updateStrategicGoal } from '@/app/athlete/actions'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface GoalTrackerProps {
  goal: string;
  roadmap?: string[];
}

const GOALS = [
  "Performance Enhancement",
  "Injury Prevention",
  "Recovery Efficiency",
  "Return from Injury",
  "Competition Prep"
]

export function GoalTracker({ goal, roadmap = [] }: GoalTrackerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()

  // Extract the strategic outcome message from roadmap
  const strategicMessage = roadmap.find(r => r.includes('Strategic Outcome [ACTIVE]'))
    || `Your current primary objective is ${goal}. Creeda is tailoring your recovery protocols to support this outcome.`

  const handleGoalUpdate = async (newGoal: string) => {
    if (newGoal === goal) {
      setIsModalOpen(false)
      return
    }

    setIsUpdating(true)
    const res = await updateStrategicGoal(newGoal)
    if (res.success) {
      toast.success('Strategic Outcome Updated', {
        description: `Your goal is now set to ${newGoal}. Intelligence models are recalibrating.`
      })
      router.refresh()
      setIsModalOpen(false)
    } else {
      toast.error(res.error || 'Failed to update goal')
    }
    setIsUpdating(false)
  }

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isModalOpen])

  return (
    <>
      <div 
        onClick={() => setIsModalOpen(true)}
        className="relative p-6 rounded-[2.5rem] bg-[#0F172A] border border-white/10 cursor-pointer overflow-hidden shadow-2xl hover:border-primary/50 group transition-all duration-500"
      >
        {/* Background Gradient */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] -mr-16 -mt-16 group-hover:bg-primary/20 transition-all duration-700" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 group-hover:scale-110 transition-transform duration-500">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Strategic Outcome</p>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none">{goal}</h3>
            </div>
          </div>

          <div className="flex-1 max-w-md">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 group-hover:border-primary/20 transition-all flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5 animate-pulse" />
              <p className="text-xs font-bold text-muted-foreground leading-relaxed italic">
                &quot;{strategicMessage.replace('Strategic Outcome [ACTIVE]: ', '')}&quot;
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between md:justify-end gap-4">
             <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
              <CheckCircle2 className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Active Protocol</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Goal Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[#070B14]/90 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => !isUpdating && setIsModalOpen(false)}
          />
          
          <div className="relative w-full max-w-md bg-[#0F172A] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setIsModalOpen(false)}
              disabled={isUpdating}
              className="absolute top-6 right-6 text-muted-foreground hover:text-white transition-colors z-20"
            >
              <X size={24} />
            </button>

            <div className="relative p-8 pt-12">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-[80px] -mr-24 -mt-24 pointer-events-none" />
              
              <div className="relative z-10">
                <div className="h-14 w-14 bg-primary/20 rounded-2xl flex items-center justify-center mb-6 border border-primary/30">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Change Outcome</h2>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed mb-8">
                  Select your current focus. Creeda will recalibrate all algorithms and recovery directives to support this objective.
                </p>

                <div className="space-y-3 mb-8">
                  {GOALS.map((g) => (
                    <button
                      key={g}
                      onClick={() => handleGoalUpdate(g)}
                      disabled={isUpdating}
                      className={`w-full p-5 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all flex items-center justify-between group/item ${
                        goal === g 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-white/5 bg-white/5 text-muted-foreground hover:border-white/20 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {goal === g ? <CheckCircle2 className="h-4 w-4" /> : <Target className="h-4 w-4 opacity-40" />}
                        {g}
                      </div>
                      <ChevronRight className={`h-4 w-4 transition-transform group-hover/item:translate-x-1 ${goal === g ? 'opacity-100' : 'opacity-0'}`} />
                    </button>
                  ))}
                </div>

                {isUpdating && (
                  <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 animate-pulse">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Syncing Intelligence Hub...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
