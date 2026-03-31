'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { submitCoachOnboarding } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight, ArrowLeft, Loader2, ShieldCheck, LayoutGrid, CheckCircle2, Trophy, Zap } from 'lucide-react'
import { AvatarUpload } from '@/components/AvatarUpload'
import { createClient } from '@/lib/supabase/client'
import { SPORTS_LIST } from '@/lib/constants'
import { scrollToTop } from '@/lib/utils'

const coachSchema = z.object({
  fullName: z.string().min(2, "Full Name is required"),
  username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed"),
  mobileNumber: z.string().min(10, "Valid mobile number required"),
  teamName: z.string().min(2, "Team/Squad name required"),
  sportCoached: z.enum(SPORTS_LIST as any),
  coachingLevel: z.enum(["Private Pro Coach", "Academy / Club Coach", "School / University Coach"]),
  teamType: z.enum(["Single Team", "Multiple Teams / Age Groups", "Individual Athletes"]),
  mainCoachingFocus: z.enum(["Injury Risk Reduction", "Peak Performance Optimization", "Player Compliance", "Scouting / Talent ID"]),
  numberOfAthletes: z.enum(["1-5", "6-15", "16-30", "30+"]),
  trainingFrequency: z.enum(["Daily", "3-4x Weekly", "1-2x Weekly"]),
  criticalRisks: z.array(z.string()).min(1, "Select at least one clinical priority").default(["General Fatigue"])
})

type CoachFormValues = z.infer<typeof coachSchema>

const STEPS = [
  { id: 'identity', title: 'Professional Identity', description: 'Configure your primary coaching profile.' },
  { id: 'blueprint', title: 'Squad Blueprint', description: 'Define the architectural structure of your team.' },
  { id: 'context', title: 'Operational Context', description: 'Calibrate training frequency and strategic focus.' },
  { id: 'matrix', title: 'Priority Matrix', description: 'Configure intelligence engine risk priorities.' }
]

export default function CoachOnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    scrollToTop()
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<CoachFormValues>({
    resolver: zodResolver(coachSchema) as any,
    defaultValues: {
      username: '',
      sportCoached: 'Cricket',
      coachingLevel: 'Academy / Club Coach',
      teamType: 'Single Team',
      mainCoachingFocus: 'Peak Performance Optimization',
      numberOfAthletes: '6-15',
      trainingFrequency: '3-4x Weekly',
      criticalRisks: ['General Fatigue']
    }
  })

  const nextStep = async () => {
    let fields: any[] = []
    if (currentStep === 0) fields = ["fullName", "username", "mobileNumber"]
    if (currentStep === 1) fields = ["teamName", "sportCoached", "coachingLevel", "teamType"]
    if (currentStep === 2) fields = ["mainCoachingFocus", "numberOfAthletes", "trainingFrequency"]
    if (currentStep === 3) fields = ["criticalRisks"]

    const isValid = await trigger(fields)
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
      scrollToTop()
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
    scrollToTop()
  }

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    setError(null)
    const result = await submitCoachOnboarding({ ...data, avatarUrl })
    if (result?.error) {
      setError(result.error)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-900 rounded-full border border-slate-800 mb-6">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Coach Onboarding</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black italic text-white tracking-tighter uppercase mb-4 font-orbitron">Performance<span className="text-primary">Intelligence</span></h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em]">Initialize Your Operational Framework / V5.0</p>
        </div>

        {/* Progress Matrix */}
        <div className="grid grid-cols-4 gap-4 mb-12">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="space-y-3">
              <div className={`h-1.5 rounded-full transition-all duration-1000 ${idx <= currentStep ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-slate-900'}`} />
              <p className={`text-[8px] font-bold uppercase tracking-widest text-center ${idx === currentStep ? 'text-primary' : 'text-slate-600'}`}>{step.title}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
             <LayoutGrid className="h-48 w-48 text-white" />
          </div>
          
          <div className="p-10 md:p-14">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-12"
                >
                  <div className="pb-10 border-b border-slate-800">
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight">{STEPS[currentStep].title}</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">{STEPS[currentStep].description}</p>
                  </div>

                  {currentStep === 0 && (
                    <div className="space-y-8">
                      <div className="flex flex-col items-center justify-center mb-4">
                        {userId && (
                          <div className="relative group">
                            <AvatarUpload uid={userId} onUploadComplete={(url) => setAvatarUrl(url)} />
                            <div className="absolute -bottom-2 -right-2 bg-primary rounded-full p-1 border-4 border-[#080C14]">
                              <CheckCircle2 size={12} className="text-white" />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Full Name & Title</Label>
                          <Input {...register("fullName")} placeholder="e.g. Head Coach Anil Kumar" className="h-14 bg-slate-950/50 border-slate-800 text-white rounded-xl px-6 focus:ring-primary/50 text-sm font-bold placeholder:text-slate-700" />
                          {errors.fullName && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.fullName.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Professional Handle</Label>
                          <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 font-bold">@</span>
                            <Input {...register("username")} className="h-14 bg-slate-950/50 border-slate-800 text-white rounded-xl pl-12 pr-6 focus:ring-primary/50 text-sm font-bold placeholder:text-slate-700" placeholder="coach_anil" />
                          </div>
                          {errors.username && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.username.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Verification Number (WhatsApp)</Label>
                          <Input {...register("mobileNumber")} placeholder="+91 98XXX XXXXX" className="h-14 bg-slate-950/50 border-slate-800 text-white rounded-xl px-6 focus:ring-primary/50 text-sm font-bold placeholder:text-slate-700" />
                          {errors.mobileNumber && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.mobileNumber.message}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 1 && (
                    <div className="space-y-8">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] text-white/50 font-black uppercase tracking-widest ml-1">Initial Squad Name</Label>
                          <Input {...register("teamName")} placeholder="e.g. Haryana U-19 Elite Squad" className="h-14 bg-white/5 border-white/10 text-white rounded-xl px-4 focus:ring-primary/50 text-sm font-bold" />
                          {errors.teamName && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.teamName.message}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Primary Sport</Label>
                            <select {...register("sportCoached")} className="w-full h-14 bg-slate-950/50 border-slate-800 text-white rounded-xl px-4 appearance-none outline-none focus:border-primary border-2 text-sm font-bold">
                               {SPORTS_LIST.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Coaching Tier</Label>
                            <select {...register("coachingLevel")} className="w-full h-14 bg-slate-950/50 border-slate-800 text-white rounded-xl px-4 appearance-none outline-none focus:border-primary border-2 text-sm font-bold">
                               {["Private Pro Coach", "Academy / Club Coach", "School / University Coach"].map(l => <option key={l} value={l} className="bg-slate-900">{l}</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Organizational Structure</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {["Single Team", "Multiple Teams / Age Groups", "Individual Athletes"].map(type => (
                              <button 
                                key={type} 
                                type="button" 
                                onClick={() => setValue('teamType', type as any)}
                                className={`h-14 rounded-xl border-2 font-bold text-[9px] uppercase tracking-[0.2em] transition-all duration-300 ${watch('teamType') === type ? 'border-primary bg-primary text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.15)]' : 'border-slate-800 bg-slate-950/50 text-slate-500 hover:border-slate-700'}`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-8">
                      <div className="space-y-8">
                        <div className="space-y-4">
                          <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Primary Strategic Focus</Label>
                          <div className="grid grid-cols-1 gap-3">
                            {["Injury Risk Reduction", "Peak Performance Optimization", "Player Compliance", "Scouting / Talent ID"].map(focus => (
                              <button 
                                key={focus} 
                                type="button" 
                                onClick={() => setValue('mainCoachingFocus', focus as any)}
                                className={`h-16 rounded-2xl border-2 font-bold text-[10px] uppercase tracking-widest text-left px-8 flex items-center justify-between transition-all ${watch('mainCoachingFocus') === focus ? 'border-primary bg-primary text-slate-950' : 'border-slate-800 bg-slate-950/50 text-slate-500 hover:border-slate-700'}`}
                              >
                                {focus}
                                {watch('mainCoachingFocus') === focus && <ShieldCheck size={16} />}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                          <div className="space-y-3">
                            <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Headcount</Label>
                            <select {...register("numberOfAthletes")} className="w-full h-14 bg-slate-950/50 border-slate-800 text-white rounded-xl px-4 appearance-none outline-none focus:border-primary border-2 text-sm font-bold">
                               {["1-5", "6-15", "16-30", "30+"].map(n => <option key={n} value={n} className="bg-slate-900">{n} Athletes</option>)}
                            </select>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Training Cycles</Label>
                            <select {...register("trainingFrequency")} className="w-full h-14 bg-slate-950/50 border-slate-800 text-white rounded-xl px-4 appearance-none outline-none focus:border-primary border-2 text-sm font-bold">
                               {["Daily", "3-4x Weekly", "1-2x Weekly"].map(f => <option key={f} value={f} className="bg-slate-900">{f}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-8">
                      <div className="space-y-6">
                        <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-widest">
                          Define the clinical indicators the intelligence engine should monitor with highest priority across your squad environment.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                          {["Non-Contact ACL", "Hamstring Strains", "Mental Burnout", "Fatigue-Related Error", "Chronic Overload", "General Fatigue"].map(risk => (
                            <button
                              key={risk}
                              type="button"
                              onClick={() => {
                                const curr = watch('criticalRisks') || []
                                if (curr.includes(risk)) {
                                  setValue('criticalRisks', curr.filter(r => r !== risk))
                                } else {
                                  setValue('criticalRisks', [...curr, risk])
                                }
                              }}
                              className={`h-14 px-4 rounded-xl border-2 font-bold text-[9px] uppercase tracking-widest transition-all ${watch('criticalRisks')?.includes(risk) ? 'border-primary bg-primary text-slate-950 shadow-lg shadow-primary/20' : 'border-slate-800 bg-slate-950/50 text-slate-500 hover:border-slate-700'}`}
                            >
                              {risk}
                            </button>
                          ))}
                        </div>
                        {errors.criticalRisks && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.criticalRisks.message}</p>}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {error && <p className="text-[10px] font-bold text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20 uppercase tracking-widest text-center">{error}</p>}

              <div className="flex items-center justify-between pt-10 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className={`h-14 px-8 rounded-2xl border-slate-800 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-800 hover:text-white transition-all ${currentStep === 0 ? 'invisible' : ''}`}
                >
                  <ArrowLeft className="mr-3 h-4 w-4" /> Previous
                </Button>

                {currentStep === STEPS.length - 1 ? (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-16 px-12 rounded-2xl bg-primary text-slate-950 hover:bg-white shadow-xl shadow-primary/10 font-bold uppercase tracking-widest text-[10px] transition-all duration-500"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-3"><Loader2 size={16} className="animate-spin" /> Verifying...</span>
                    ) : (
                      <span className="flex items-center gap-3">Complete Setup <CheckCircle2 size={16} /></span>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="h-16 px-12 rounded-2xl bg-white text-slate-950 hover:bg-primary font-bold uppercase tracking-widest text-[10px] shadow-xl transition-all duration-500"
                  >
                    Next Step <ArrowRight className="ml-3 h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.4em]">Creeda Performance Intelligence Platform</p>
        </div>
      </div>
    </div>
  )
}
