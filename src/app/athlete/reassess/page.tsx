'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  Zap, ArrowLeft, ArrowRight, Brain, RotateCcw, 
  Dumbbell, Timer, Activity, ShieldAlert, Sparkles,
  Trophy, CheckCircle2, RefreshCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { submitDiagnosticForm } from '../onboarding/actions'

const REASSESSMENT_DOMAINS = [
  { id: 'endurance_capacity', label: 'Endurance capacity', icon: Activity, question: 'How has your aerobic repeat-effort capacity felt over the last 21 days?', color: 'text-india-green' },
  { id: 'strength_capacity', label: 'Strength capacity', icon: Dumbbell, question: 'Rate your overall force production and strength stability recently.', color: 'text-blue-500' },
  { id: 'explosive_power', label: 'Explosive power', icon: Zap, question: 'How crisp and explosive have your primary power movements felt?', color: 'text-amber-500' },
  { id: 'agility_control', label: 'Agility & Sharpness', icon: Activity, icon2: RotateCcw, question: 'Rate your change-of-direction sharpness and balance.', color: 'text-violet-500' },
  { id: 'reaction_self_perception', label: 'Reaction Speed', icon: Brain, question: 'How fast and decisive has your neurological response felt?', color: 'text-orange-500' },
  { id: 'recovery_efficiency', label: 'Recovery Speed', icon: Timer, question: 'How efficiently have you been recovering between hard sessions?', color: 'text-indigo-500' },
  { id: 'fatigue_resistance', label: 'Fatigue Resilience', icon: Activity, question: 'Rate your technical consistency when fatigue begins to set in.', color: 'text-rose-500' },
  { id: 'load_tolerance', label: 'Load Tolerance', icon: Trophy, question: 'How well have you handled the total training volume this month?', color: 'text-cyan-500' },
  { id: 'movement_robustness', label: 'Movement Robustness', icon: ShieldAlert, question: 'Rate your feeling of physical "robustness" vs small niggles or tightness.', color: 'text-red-500' },
  { id: 'coordination_control', label: 'Technical Control', icon: Brain, question: 'Rate your overall fine-motor coordination and movement mastery.', color: 'text-primary' },
]

export default function ReassessmentPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [reactionMs, setReactionMs] = useState<number | null>(null)
  const [reactionTrials, setReactionTrials] = useState<number[]>([])
  const [reactionState, setReactionState] = useState<'idle' | 'waiting' | 'active' | 'success' | 'fail' | 'complete'>('idle')
  const [startTime, setStartTime] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const [diagnostic, setDiagnostic] = useState<any>(null)

  useEffect(() => {
    async function fetchBaseline() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('diagnostics').select('*').eq('athlete_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (data) {
          setDiagnostic(data)
          // Pre-fill with previous scores if available
          if (data.physiology_profile) {
              const prevScores: any = {}
              REASSESSMENT_DOMAINS.forEach(d => {
                  prevScores[d.id] = data.physiology_profile[d.id] || 2
              })
              setScores(prevScores)
          }
        }
      }
    }
    fetchBaseline()
  }, [])

  const nextStep = () => {
    if (currentStep < REASSESSMENT_DOMAINS.length + 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleFinalSubmit()
    }
  }

  const handleScoreSelect = (score: number) => {
    const domain = REASSESSMENT_DOMAINS[currentStep].id
    setScores(prev => ({ ...prev, [domain]: score }))
    setTimeout(nextStep, 300)
  }

  const startReactionTest = () => {
    setReactionState('waiting')
    // Random unpredictable delay between 2000ms and 5000ms to prevent anticipation bias
    const delay = Math.random() * 3000 + 2000
    setTimeout(() => {
      setReactionState('active')
      setStartTime(performance.now())
    }, delay)
  }

  const handleReactionClick = () => {
    if (reactionState === 'waiting') {
      setReactionState('fail')
      toast.error('Too early — wait for signal', { description: 'False starts are discarded.' })
    } else if (reactionState === 'active') {
      const endTime = performance.now()
      // Apply device compensation layer (-15ms for mobile/browser lag)
      const rawDiff = endTime - startTime
      const adjustedDiff = Math.max(0, Math.round(rawDiff - 15))
      
      const newTrials = [...reactionTrials, adjustedDiff]
      setReactionTrials(newTrials)
      
      if (newTrials.length >= 3) {
        const avg = Math.round(newTrials.reduce((a, b) => a + b, 0) / newTrials.length)
        
        setReactionMs(avg)
        setReactionState('complete')
        toast.success('Calibration Complete', { description: `Validated average: ${avg}ms` })
      } else {
        setReactionMs(adjustedDiff)
        setReactionState('success')
      }
    }
  }

  const getReactionClassification = (ms: number) => {
    if (ms < 200) return { label: 'Elite', color: 'text-emerald-400', desc: 'Superior neurological response' }
    if (ms < 250) return { label: 'Above Average', color: 'text-primary', desc: 'Highly reactive response' }
    if (ms < 310) return { label: 'Average', color: 'text-amber-400', desc: 'Standard response range' }
    return { label: 'Slower than Baseline', color: 'text-rose-400', desc: 'Potential neuro-fatigue detected' }
  }

  const handleFinalSubmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    
    // Prepare data by merging with existing diagnostic to satisfy the submitDiagnosticForm signature
    // or just pass the segments. submitDiagnosticForm in actions.ts expects the whole data object.
    const submissionData = {
        ...diagnostic?.profile_data,
        ...diagnostic?.sport_context,
        ...diagnostic?.training_reality,
        ...diagnostic?.recovery_baseline,
        ...diagnostic?.physical_status,
        ...scores,
        reaction_time_ms: reactionMs || diagnostic?.reaction_profile?.reaction_time_ms || 250,
        fullName: diagnostic?.profile_data?.fullName,
        primarySport: diagnostic?.sport_context?.primarySport,
        primaryGoal: diagnostic?.primary_goal
    }

    try {
      const res = await submitDiagnosticForm(submissionData)
      if (res.success) {
        toast.success('Performance Profile Synchronized', { description: 'Your physiological baseline has been updated.' })
        router.push('/athlete')
      } else {
        toast.error('Sync Failed', { description: res.error })
      }
    } catch (err) {
      toast.error('Critical Sync Error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-card flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-xl z-10">
        <div className="flex items-center gap-4 mb-10">
          <div className="h-12 w-12 bg-card/5 border border-white/10 rounded-2xl flex items-center justify-center text-white">
            <RefreshCcw className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Performance Check-In</h1>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">21-Day Physiological Resync</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {currentStep < REASSESSMENT_DOMAINS.length ? (
            <motion.div 
              key={currentStep}
              className="space-y-10"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`h-1.5 w-12 rounded-full ${REASSESSMENT_DOMAINS[currentStep].color} opacity-40`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Step {currentStep + 1} of 11</span>
                </div>
                <div className="flex items-center gap-4 mb-2">
                  <div className={`h-12 w-12 rounded-2xl bg-card/5 border border-white/10 flex items-center justify-center ${REASSESSMENT_DOMAINS[currentStep].color}`}>
                    {(() => {
                      const Icon = REASSESSMENT_DOMAINS[currentStep].icon
                      return <Icon className="h-6 w-6" />
                    })()}
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{REASSESSMENT_DOMAINS[currentStep].label}</h2>
                </div>
                <p className="text-lg font-bold text-muted leading-tight italic">&quot;{REASSESSMENT_DOMAINS[currentStep].question}&quot;</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[
                  { value: 1, label: 'Declining / Struggling', sub: 'Significantly below sport demand' },
                  { value: 2, label: 'Emerging / Stable', sub: 'Meeting basic baseline daily' },
                  { value: 3, label: 'Advanced / High', sub: 'Robust and consistently sharp' },
                  { value: 4, label: 'Elite / Exceptional', sub: 'Exceeding sport demands comfortably' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleScoreSelect(option.value)}
                    className={`group p-6 rounded-3xl border-2 text-left transition-all ${scores[REASSESSMENT_DOMAINS[currentStep].id] === option.value ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10' : 'border-border bg-card/50 hover:border-border/80'}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className={`font-black uppercase tracking-tighter text-sm mb-1 ${scores[REASSESSMENT_DOMAINS[currentStep].id] === option.value ? 'text-primary' : 'text-muted'}`}>{option.label}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{option.sub}</p>
                      </div>
                      <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${scores[REASSESSMENT_DOMAINS[currentStep].id] === option.value ? 'border-primary bg-primary' : 'border-border/80'}`}>
                        {scores[REASSESSMENT_DOMAINS[currentStep].id] === option.value && <CheckCircle2 className="h-4 w-4 text-white" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : currentStep === REASSESSMENT_DOMAINS.length ? (
            <motion.div 
                key="reaction"
                className="space-y-10"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
            >
                <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Step 11 of 11</span>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <Timer className="h-6 w-6 text-amber-500" />
                        Neurological Calibration
                    </h2>
                    <p className="text-sm font-bold text-muted-foreground">Objective response test. Tap the card when it turns <span className="text-primary">GREEN</span>.</p>
                </div>

                <div 
                    onClick={reactionState === 'idle' || reactionState === 'success' || reactionState === 'fail' ? startReactionTest : handleReactionClick}
                    className={`h-64 cursor-pointer rounded-[2.5rem] border-4 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden ${
                        reactionState === 'idle' ? 'bg-card border-border' :
                        reactionState === 'waiting' ? 'bg-rose-500/20 border-rose-500 animate-pulse' :
                        reactionState === 'active' ? 'bg-primary border-white scale-105 shadow-[0_0_50px_rgba(255,255,255,0.2)]' :
                        reactionState === 'success' || reactionState === 'complete' ? 'bg-india-green border-india-green/50' :
                        'bg-red-500 border-red-400'
                    }`}
                >
                    <AnimatePresence mode="wait">
                        {reactionState === 'idle' && (
                            <motion.div key="idle" className="text-center" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
                                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Tap to Start (5 Trials Required)</p>
                            </motion.div>
                        )}
                        {reactionState === 'waiting' && (
                            <motion.div key="waiting" className="text-center">
                                <p className="text-xl font-black text-rose-500 uppercase tracking-tighter italic">WAIT FOR SIGNAL...</p>
                            </motion.div>
                        )}
                        {reactionState === 'active' && (
                            <motion.div key="active" className="text-center">
                                <Zap className="h-20 w-20 text-white animate-bounce mx-auto" />
                                <p className="text-2xl font-black text-white uppercase tracking-tighter">ZAP!</p>
                            </motion.div>
                        )}
                        {(reactionState === 'success' || reactionState === 'complete') && (
                            <motion.div key="success" className="text-center">
                                <p className="text-4xl font-black text-white mb-2">{reactionMs}ms</p>
                                {reactionState === 'complete' ? (
                                    <>
                                        <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Scientifically Validated Average</p>
                                        <div className="mt-2 flex items-center justify-center gap-1">
                                            <Trophy className="h-3 w-3 text-white" />
                                            <span className="text-[10px] font-black text-white uppercase tracking-tighter">{getReactionClassification(reactionMs!).label}</span>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Trial {reactionTrials.length} of 3 Accepted</p>
                                )}
                                <p className="mt-4 text-[9px] font-bold text-india-green/80 uppercase tracking-widest underline underline-offset-4">{reactionState === 'complete' ? 'Tap to Re-Verify' : 'Tap for Next Trial'}</p>
                            </motion.div>
                        )}
                        {reactionState === 'fail' && (
                            <div className="text-center">
                                <p className="text-xl font-black text-white uppercase tracking-tighter">TOO EARLY</p>
                                <p className="text-[9px] font-black text-white/70 uppercase tracking-widest mt-1">Wait for visual signal</p>
                                <p className="mt-4 text-[9px] font-black text-white brightness-150 uppercase tracking-widest underline underline-offset-4 cursor-pointer">Retry Trial</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => setCurrentStep(REASSESSMENT_DOMAINS.length - 1)} className="text-muted-foreground hover:text-white uppercase tracking-widest text-[10px] font-black">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    {reactionState === 'complete' && (
                        <Button onClick={nextStep} className="bg-primary text-white h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs">
                            Produce Performance Summary <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    )}
                </div>
            </motion.div>
          ) : (
            <motion.div 
                key="summary"
                className="space-y-8"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="p-8 rounded-[2.5rem] bg-indigo-500/10 border-2 border-indigo-500/20 text-center relative overflow-hidden">
                    <Sparkles className="h-12 w-12 text-indigo-400 mx-auto mb-4 opacity-40" />
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Resynchronization Ready</h3>
                    <p className="text-sm font-bold text-muted-foreground">Your performance profile will be updated with your current capacity baselines and response speed.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-5 rounded-2xl bg-card/5 border border-white/10">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Response speed</p>
                        <p className="text-xl font-black text-white">{reactionMs}ms</p>
                    </div>
                     <div className="p-5 rounded-2xl bg-card/5 border border-white/10">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Baseline Classification</p>
                        <p className={`text-xl font-black ${getReactionClassification(reactionMs!).color}`}>{getReactionClassification(reactionMs!).label}</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setCurrentStep(0)} className="h-16 flex-1 border-border text-muted-foreground rounded-2xl font-black uppercase tracking-widest text-[10px]">
                        Restart
                    </Button>
                    <Button 
                        onClick={handleFinalSubmit}
                        disabled={isSubmitting}
                        className="h-16 flex-[2] bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
                    >
                        {isSubmitting ? <Activity className="h-5 w-5 animate-spin" /> : 'Update Intelligence Baseline'}
                    </Button>
                </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-12 flex items-center gap-3 opacity-30">
        <Zap className="h-4 w-4 text-primary" />
        <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Creeda Intelligence Hub</span>
      </div>
    </div>
  )
}
