'use client'
 
import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ArrowRight, ArrowLeft, HeartPulse, Activity, CheckCircle2, ShieldAlert, 
  Scale, Moon, Target, Dumbbell, History, Sparkles, AlertTriangle, Brain, 
  ChevronRight, Info, Zap, Flame, Trophy, Layers, Microscope, LayoutGrid, 
  ShieldCheck, PlusCircle, X, Loader2
} from 'lucide-react'
import { submitDiagnosticForm } from './actions'
import { SPORTS_DATABASE } from '@/lib/sport_intelligence'
import { SPORTS_LIST } from '@/lib/constants'
import { AvatarUpload } from '@/components/AvatarUpload'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { scrollToTop } from '@/lib/utils'
import { useOnboardingPersistence } from './useOnboardingPersistence'
import { createClient } from '@/lib/supabase/client'

// --- Schemas ---
const step0Schema = z.object({
  age: z.coerce.number().min(8, "Minimum age is 8").max(80, "Maximum age is 80"),
  biologicalSex: z.enum(["Male", "Female", "Other"]),
  heightCm: z.coerce.number().min(100, "Min height 100cm").max(250, "Max height 250cm"),
  weightKg: z.coerce.number().min(20, "Min weight 20kg").max(200, "Max weight 200kg")
})

const step1Schema = z.object({
  fullName: z.string().min(2, "Full Name is required"),
  username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed"),
  primarySport: z.enum(SPORTS_LIST as any),
  position: z.string().min(1, "Position is required"),
  dominantSide: z.enum(["Left", "Right", "Both", "Ambidextrous"])
})

const step2Schema = z.object({
  playingLevel: z.enum(["Recreational", "School", "District", "State", "National", "Professional"]),
  trainingFrequency: z.enum(["1-3 days", "4-6 days", "Daily"]),
  avgIntensity: z.enum(["Low", "Moderate", "High"]),
  typicalWeeklyHours: z.coerce.number().min(0, "Min 0").max(100, "Max 100"),
  typicalRPE: z.coerce.number().min(1, "Min RPE 1").max(10, "Max RPE 10")
})

const step3Schema = z.object({
  primaryGoal: z.enum(["Performance Enhancement", "Injury Prevention", "Recovery Efficiency", "Return from Injury", "Competition Prep"])
})

const INJURY_REGIONS = [
  "Shoulder", "Elbow", "Wrist/Hand", "Upper Back", "Lower Back",
  "Hip/Groin", "Quadriceps", "Hamstring", "Knee", "Shin/Calf",
  "Ankle", "Foot", "Neck", "Chest/Ribs", "Achilles", "Side/Oblique"
] as const;

const INJURY_TYPES = ["Muscle", "Tendon", "Ligament", "Bone/Fracture", "Joint", "Nerve", "Other"] as const;
const INJURY_SIDES = ["Left", "Right", "Both", "N/A"] as const;

const MEDICAL_CONDITIONS = [
  "Asthma",
  "Diabetes (Type 1)",
  "Diabetes (Type 2)",
  "Hypertension",
  "Cardiac Condition",
  "Autoimmune Disorder",
  "Other"
] as const;

const injuryEntrySchema = z.object({
  region: z.string().min(1),
  type: z.string().min(1),
  side: z.string().min(1),
  recurring: z.boolean()
});

const step4Schema = z.object({
  currentIssue: z.enum(["No", "Yes"]),
  activeInjuries: z.array(injuryEntrySchema).optional(),
  pastMajorInjury: z.enum(["No", "Yes"]),
  pastInjuries: z.array(injuryEntrySchema).optional(),
  hasIllness: z.enum(["No", "Yes"]),
  illnesses: z.array(z.string()).optional(),
})


const physiologySchema = z.object({
  endurance_capacity: z.number().min(1).max(4),
  strength_capacity: z.number().min(1).max(4),
  explosive_power: z.number().min(1).max(4),
  agility_control: z.number().min(1).max(4),
  reaction_self_perception: z.number().min(1).max(4).optional().default(2),
  recovery_efficiency: z.number().min(1).max(4),
  fatigue_resistance: z.number().min(1).max(4),
  load_tolerance: z.number().min(1).max(4),
  movement_robustness: z.number().min(1).max(4),
  coordination_control: z.number().min(1).max(4),
  reaction_time_ms: z.number().optional()
})

const step6Schema = z.object({
  typicalSleep: z.enum(["< 6 hours", "6-7 hours", "7-8 hours", "8-9 hours", "> 9 hours"]),
  usualWakeUpTime: z.string(),
  typicalSoreness: z.enum(["None", "Low", "Moderate", "High"]),
  typicalEnergy: z.enum(["Low", "Moderate", "High"])
})

const step7Schema = z.object({
  legalConsent: z.boolean().refine(val => val === true, "Consent is required to continue"),
  minorGuardianConsent: z.boolean().optional()
})

const onboardingSchema = z.object({
  ...step0Schema.shape,
  ...step1Schema.shape,
  ...step2Schema.shape,
  ...step3Schema.shape,
  ...step4Schema.shape,

  ...physiologySchema.shape,
  ...step6Schema.shape,
  ...step7Schema.shape,
  coachLockerCode: z.string().optional()
}).refine((data: any) => {
  if (data.age < 18 && !data.minorGuardianConsent) return false
  return true
}, {
  message: "Guardian or coach consent is required for athletes under 18",
  path: ["minorGuardianConsent"]
})

type OnboardingValues = z.infer<typeof onboardingSchema>

// --- Step Configuration ---
const STEP_LABELS: Record<number, { title: string; subtitle: string; icon: any }> = {
  0: { title: 'Athlete Setup', subtitle: "Biological & Sport Identity", icon: Zap },
  1: { title: 'Training Load', subtitle: 'Help creeda understand your general training load', icon: Flame },
  2: { title: 'Your Goal', subtitle: 'What is your primary goal for using Creeda?', icon: Target },
  3: { title: 'Injury History', subtitle: 'Map your injury intelligence', icon: ShieldAlert },
  4: { title: 'Physiology Check', subtitle: 'Endurance & Strength (1/9)', icon: Brain },
  5: { title: 'Physiology Check', subtitle: 'Explosive Power (2/9)', icon: Brain },
  6: { title: 'Physiology Check', subtitle: 'Agility (3/9)', icon: Brain },
  7: { title: 'Physiology Check', subtitle: 'Recovery (4/9)', icon: Brain },
  8: { title: 'Physiology Check', subtitle: 'Fatigue Resistance (5/9)', icon: Brain },
  9: { title: 'Physiology Check', subtitle: 'Training Load (6/9)', icon: Brain },
  10: { title: 'Physiology Check', subtitle: 'Movement Quality (7/9)', icon: Brain },
  11: { title: 'Physiology Check', subtitle: 'Body Control (8/9)', icon: Brain },
  12: { title: 'Physiology Check', subtitle: 'Balance & Stability (9/9)', icon: Brain },
  13: { title: 'Reaction Test', subtitle: 'Measure your cognitive reflex speed', icon: Activity },
  14: { title: 'Wellness Sync', subtitle: 'Recovery & circadian calibration', icon: Moon },
  15: { title: 'Consent & Authorization', subtitle: 'Review and accept terms', icon: ShieldCheck },
}

export default function AthleteOnboarding() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [showResumeModal, setShowResumeModal] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [userLoaded, setUserLoaded] = useState(false)
  
  // Reaction Test States
  const [reactionState, setReactionState] = useState<'idle' | 'waiting' | 'ready' | 'result' | 'complete' | 'fail'>('idle')
  const [reactionScore, setReactionScore] = useState<number | null>(null)
  const [reactionTrials, setReactionTrials] = useState<number[]>([])
  const reactionSignalAtRef = useRef<number | null>(null)
  const reactionDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const [userId, setUserId] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const router = useRouter()

  // Injury local state (synced to react-hook-form)
  type InjuryEntry = { region: string; type: string; side: string; recurring: boolean };
  const [activeInjuries, setActiveInjuries] = useState<InjuryEntry[]>([])
  const [pastInjuries, setPastInjuries] = useState<InjuryEntry[]>([])
  const [illnesses, setIllnesses] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema) as any,
    defaultValues: {
      fullName: "",
      username: "",
      age: 18,
      biologicalSex: "Male",
      heightCm: 175,
      weightKg: 70,
      primarySport: "Cricket",
      position: "Fast Bowler",
      dominantSide: "Right",
      playingLevel: "District",
      trainingFrequency: "4-6 days",
      avgIntensity: "Moderate",
      typicalWeeklyHours: 5,
      typicalRPE: 6,
      primaryGoal: "Performance Enhancement",
      currentIssue: "No",
      activeInjuries: [],
      pastMajorInjury: "No",
      pastInjuries: [],
      hasIllness: "No",
      illnesses: [],
      endurance_capacity: 2,
      strength_capacity: 2,
      explosive_power: 2,
      agility_control: 2,
      reaction_self_perception: 2,
      recovery_efficiency: 2,
      fatigue_resistance: 2,
      load_tolerance: 2,
      movement_robustness: 2,
      coordination_control: 2,
    }
  })

  const formValues = watch()
  const { clearDraft } = useOnboardingPersistence(formValues, currentStep, (vals) => reset(vals), setCurrentStep, isReady, userId)

   useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        // Clear any stale guest drafts when a real user logs in
        try { localStorage.removeItem('creeda_onboarding_draft_guest') } catch (_) {}
        // Pre-fill name if available
        supabase.from('profiles').select('full_name').eq('id', user.id).single()
          .then(({ data }) => {
            if (data?.full_name && !watch('fullName')) {
              setValue('fullName', data.full_name)
            }
          })
      }
      setUserLoaded(true)
    })
  }, [])

  useEffect(() => {
    // Don't check for drafts until we know who the user is
    if (!userLoaded) return;
    
    const persistenceKey = userId ? `creeda_onboarding_draft_${userId}` : null;
    // For brand new / guest users with no persistence key, skip draft check entirely
    if (!persistenceKey) {
      setIsReady(true)
      return
    }
    const draft = localStorage.getItem(persistenceKey)
    if (draft && !showResumeModal && currentStep === 0 && !isReady) {
      setShowResumeModal(true)
    } else if (!draft) {
      setIsReady(true)
    }
  }, [currentStep, isReady, userId, userLoaded])

  const resumeOnboarding = async () => {
    const persistenceKey = userId ? `creeda_onboarding_draft_${userId}` : 'creeda_onboarding_draft_guest';
    const draft = localStorage.getItem(persistenceKey)
    if (draft) {
      try {
        const { decryptData } = await import('@/lib/secure_storage')
        const decrypted = await decryptData(draft)
        const data = JSON.parse(decrypted)
        if (data && data.values) {
          reset(data.values)
          setCurrentStep(data.step || 0)
          toast.success("Intelligence profile resumed.")
        }
      } catch (err) {
        console.error("Resume failure:", err)
        toast.error("Failed to decrypt profile. Starting fresh.")
        resetOnboarding()
      }
    }
    setIsReady(true)
    setShowResumeModal(false)
  }

  const resetOnboarding = () => {
    const persistenceKey = userId ? `creeda_onboarding_draft_${userId}` : 'creeda_onboarding_draft_guest';
    clearDraft()
    localStorage.removeItem(persistenceKey)
    sessionStorage.removeItem('creeda_session_entropy')
    reset({
      fullName: "",
      username: "",
      age: 25,
      biologicalSex: "Male",
      heightCm: 180,
      weightKg: 75,
      primarySport: "Basketball",
      position: "Guard",
      dominantSide: "Right",
      playingLevel: "Professional",
      trainingFrequency: "4-6 days",
      avgIntensity: "High",
      typicalWeeklyHours: 8,
      typicalRPE: 7,
      primaryGoal: "Performance Enhancement",
      currentIssue: "No",
      activeInjuries: [],
      pastMajorInjury: "No",
      pastInjuries: [],
      endurance_capacity: 2,
      strength_capacity: 2,
      explosive_power: 2,
      agility_control: 2,
      reaction_self_perception: 2,
      recovery_efficiency: 2,
      fatigue_resistance: 2,
      load_tolerance: 2,
      movement_robustness: 2,
      coordination_control: 2,
      typicalSleep: "7-8 hours",
      usualWakeUpTime: "07:00",
      typicalSoreness: "Low",
      typicalEnergy: "Moderate",
      legalConsent: false,
      minorGuardianConsent: false,
      coachLockerCode: ""
    })
    setCurrentStep(0)
    setIsReady(true)
    setShowResumeModal(false)
    toast.success("Profile reset. Start fresh.")
  }

  const jumpToStep = (step: number) => {
    setCurrentStep(step)
    scrollToTop()
  }

  const TOTAL_STEPS = 16

  const nextStep = async () => {
    let fields: any[] = []
    if (currentStep === 0) fields = ["fullName", "username", "age", "biologicalSex", "heightCm", "weightKg", "primarySport", "position"]
    if (currentStep === 1) fields = ["playingLevel", "trainingFrequency", "avgIntensity", "typicalWeeklyHours", "typicalRPE"]
    if (currentStep === 2) fields = ["primaryGoal"]
    if (currentStep === 3) fields = ["currentIssue", "pastMajorInjury"]
    
    // Steps 4-12 are Physiology Check (Neural Check)
    if (currentStep === 4) fields = ["endurance_capacity"]
    if (currentStep === 5) fields = ["strength_capacity"]
    if (currentStep === 6) fields = ["explosive_power"]
    if (currentStep === 7) fields = ["agility_control"]
    if (currentStep === 8) fields = ["recovery_efficiency"]
    if (currentStep === 9) fields = ["fatigue_resistance"]
    if (currentStep === 10) fields = ["load_tolerance"]
    if (currentStep === 11) fields = ["movement_robustness"]
    if (currentStep === 12) fields = ["coordination_control"]
    
    // Step 13 is Reaction Test
    if (currentStep === 13) {
      fields = ["reaction_time_ms"]
      // Custom check: if reaction test isn't complete, we shouldn't continue
      if (reactionState !== 'complete' && !watch('reaction_time_ms')) {
        toast.error("Please complete the reaction test protocol to continue.")
        return
      }
    }

    if (currentStep === 14) fields = ["typicalSleep", "typicalSoreness", "typicalEnergy"]
    if (currentStep === 15) fields = ["legalConsent", "minorGuardianConsent"]

    const isValid = await trigger(fields)
    if (isValid) {
      setCurrentStep(Math.min(currentStep + 1, TOTAL_STEPS - 1))
      scrollToTop()
    }
  }

  const prevStep = () => {
    setCurrentStep(Math.max(currentStep - 1, 0))
    scrollToTop()
  }

  const onSubmit = async (vals: OnboardingValues) => {
    setIsSubmitting(true)
    try {
      // Convert Hours to Minutes for backend compatibility
      const data = {
        ...vals,
        typicalWeeklyMinutes: (vals as any).typicalWeeklyHours * 60,
        seasonPhase: "In-season",
        avatar_url: avatarUrl || undefined
      }
      const result = await submitDiagnosticForm(data)
      if (result.success) {
        toast.success("Intelligence successfully integrated!")
        router.push('/athlete/dashboard')
      } else {
        toast.error("Process interrupted: " + result.error)
      }
    } catch (err) {
      toast.error("Critical error in intelligence uplink")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reaction Game Logic
  const startReactionTest = () => {
    setReactionState('waiting')
    reactionSignalAtRef.current = null
    const delay = Math.floor(Math.random() * 3000) + 2000
    reactionDelayTimerRef.current = setTimeout(() => {
      setReactionState('ready')
      reactionSignalAtRef.current = performance.now()
    }, delay)
  }

  const handleReactionClick = () => {
    // Idle: start the test
    if (reactionState === 'idle') {
      startReactionTest()
      return
    }
    // Clicked too early
    if (reactionState === 'waiting') {
      clearTimeout(reactionDelayTimerRef.current!)
      reactionSignalAtRef.current = null
      setReactionState('fail')
      setTimeout(() => setReactionState('idle'), 1500)
      return
    }
    // Valid reaction
    if (reactionState === 'ready' && reactionSignalAtRef.current !== null) {
      const time = Math.round(performance.now() - reactionSignalAtRef.current)
      const newTrials = [...reactionTrials, time]
      setReactionTrials(newTrials)
      setReactionScore(time)
      setReactionState('result')
      
      if (newTrials.length >= 3) {
        const avg = Math.round(newTrials.reduce((a, b) => a + b, 0) / newTrials.length)
        setValue('reaction_time_ms', avg)
        setTimeout(() => setReactionState('complete'), 1500)
      } else {
        setTimeout(() => setReactionState('idle'), 1500)
      }
    }
  }

  const StepIcon = STEP_LABELS[currentStep]?.icon || Activity

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="mb-12 text-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-4 py-2 bg-slate-900/50 rounded-full border border-slate-800 mb-6"
          >
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Creeda Intelligence v5.0: Digital Sports Scientist</span>
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
            Initialize Profile
          </h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">Comprehensive Onboarding Protocol</p>
        </div>

        {/* Progress System */}
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-12">
          {Array.from({ length: TOTAL_STEPS }).map((_, idx) => (
            <button key={idx} onClick={() => jumpToStep(idx)} className="space-y-2 group cursor-pointer text-left w-full outline-none">
              <div 
                className={`h-1.5 rounded-full transition-all duration-700 ${
                  idx < currentStep ? 'bg-primary' : 
                  idx === currentStep ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 
                  'bg-slate-800 group-hover:bg-slate-700'
                }`} 
              />
              <div className={`text-[6px] font-bold text-center transition-colors ${idx === currentStep ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'}`}>
                {String(idx + 1).padStart(2, '0')}
              </div>
            </button>
          ))}
        </div>

        <div className="bg-slate-900/50 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden relative backdrop-blur-xl">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
             <StepIcon className="h-48 w-48 text-white" />
          </div>

          <div className="p-10 md:p-14">
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
                  <div className="flex items-center gap-4 mb-3">
                    <div className="h-10 w-10 bg-slate-800 rounded-xl flex items-center justify-center text-primary border border-slate-700">
                      <StepIcon className="h-5 w-5" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      {STEP_LABELS[currentStep]?.title || 'System Initialization'}
                    </h2>
                  </div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                    {STEP_LABELS[currentStep]?.subtitle}
                  </p>
                </div>

                <div className="min-h-[300px]">
                  {/* Step 0: Athlete Setup */}
                  {currentStep === 0 && (
                    <div className="space-y-8">
                       {/* Profile Picture */}
                       {userId && (
                         <div className="flex justify-center">
                           <AvatarUpload uid={userId} onUploadComplete={(url) => setAvatarUrl(url)} />
                         </div>
                       )}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-3">
                            <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Full Name</Label>
                            <Input {...register("fullName")} className="h-16 bg-slate-950/50 border-slate-800 text-white rounded-2xl px-6 focus:ring-primary border-2 text-lg font-bold" placeholder="First Last" />
                         </div>
                         <div className="space-y-3">
                            <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Username</Label>
                            <div className="relative">
                               <span className="absolute left-6 top-1/2 -translate-y-1/2 text-primary font-bold">@</span>
                               <Input {...register("username")} className="h-16 bg-slate-950/50 border-slate-800 text-white rounded-2xl pl-12 pr-6 focus:ring-primary border-2 text-lg font-bold" placeholder="handle" />
                            </div>
                         </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-3">
                            <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Primary Sport</Label>
                            <select {...register("primarySport")} 
                              onChange={(e) => {
                                setValue('primarySport', e.target.value as any)
                                const sportKey = e.target.value.toLowerCase()
                                const positions = SPORTS_DATABASE[sportKey]?.positions || []
                                if (positions.length > 0) {
                                  setValue('position', positions[0].name)
                                } else {
                                  setValue('position', "")
                                }
                              }}
                              className="w-full h-16 bg-slate-950/50 border-2 border-slate-800 text-white rounded-2xl px-6 focus:ring-primary outline-none text-sm font-bold uppercase tracking-widest"
                            >
                               {SPORTS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                         </div>
                         <div className="space-y-3">
                            <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Playing Position</Label>
                            {(() => {
                               const sportKey = watch('primarySport')?.toLowerCase()
                               const positions = SPORTS_DATABASE[sportKey]?.positions || []
                               if (positions.length > 0) {
                                 return (
                                   <select {...register("position")} className="w-full h-16 bg-slate-950/50 border-2 border-slate-800 text-white rounded-2xl px-6 focus:ring-primary outline-none text-sm font-bold uppercase">
                                      {positions.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                                   </select>
                                 )
                               }
                               return (
                                 <Input {...register("position")} className="h-16 bg-slate-950/50 border-slate-800 text-white rounded-2xl px-6 focus:ring-primary border-2 text-sm font-bold" placeholder="e.g. Forward / Defender" />
                               )
                            })()}
                         </div>
                       </div>

                       <div className="h-px w-full bg-slate-800/50 my-8"></div>

                       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                         <div className="space-y-3">
                            <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Age</Label>
                            <Input type="number" {...register("age")} className="h-16 bg-slate-950/50 border-slate-800 text-white rounded-2xl px-4 focus:ring-primary border-2 text-lg font-bold text-center" />
                            {errors.age && <p className="text-[10px] text-red-500 font-bold">{errors.age.message}</p>}
                         </div>
                         <div className="space-y-3 col-span-1">
                            <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center block">Sex</Label>
                            <div className="grid grid-cols-2 gap-2">
                               {["Male", "Female"].map(s => (
                                 <button key={s} type="button" onClick={() => setValue('biologicalSex', s as any)} 
                                   className={`h-16 rounded-2xl border-2 font-bold uppercase text-[9px] tracking-widest transition-all ${watch('biologicalSex') === s ? 'border-primary bg-primary text-slate-950' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
                                   {s === 'Male' ? 'M' : 'F'}
                                 </button>
                               ))}
                            </div>
                         </div>
                         <div className="space-y-3">
                            <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center block">Height (CM)</Label>
                            <Input type="number" {...register("heightCm")} className="h-16 bg-slate-950/50 border-slate-800 text-white rounded-2xl px-4 focus:ring-primary border-2 text-lg font-bold text-center" />
                         </div>
                         <div className="space-y-3">
                            <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center block">Weight (KG)</Label>
                            <Input type="number" {...register("weightKg")} className="h-16 bg-slate-950/50 border-slate-800 text-white rounded-2xl px-4 focus:ring-primary border-2 text-lg font-bold text-center" />
                         </div>
                       </div>
                    </div>
                  )}

                   {/* Step 13: Reaction Test Game */}
                  {currentStep === 13 && (
                    <div className="flex flex-col items-center justify-center space-y-8 py-10">
                       <div className="text-center space-y-2">
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Average Reflex Speed: <span className="text-primary font-bold">{watch('reaction_time_ms') || '---'} ms</span></p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest">Requirement: 3 successful trials</p>
                       </div>

                       <div 
                         onClick={handleReactionClick}
                         className={`w-64 h-64 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-2xl relative select-none
                           ${reactionState === 'idle' ? 'bg-slate-800 border-2 border-slate-700 hover:bg-slate-700 hover:border-primary/50 active:scale-95' : ''}
                           ${reactionState === 'waiting' ? 'bg-amber-500/10 border-2 border-amber-500/50' : ''}
                           ${reactionState === 'ready' ? 'bg-primary border-2 border-white shadow-[0_0_30px_rgba(255,159,28,0.4)] scale-105' : ''}
                           ${reactionState === 'result' ? 'bg-emerald-500 border-2 border-white' : ''}
                           ${reactionState === 'fail' ? 'bg-red-500/10 border-2 border-red-500' : ''}
                           ${reactionState === 'complete' ? 'bg-emerald-500/5 border-2 border-emerald-500/30' : ''}
                         `}
                       >
                         {reactionState === 'idle' && (
                           <>
                             <Zap className="h-12 w-12 text-primary mb-4" />
                             <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{reactionTrials.length === 0 ? 'Tap to Begin' : `Tap for Trial ${reactionTrials.length + 1}`}</span>
                           </>
                         )}
                         {reactionState === 'waiting' && <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Wait for signal...</span>}
                         {reactionState === 'ready' && <span className="text-2xl font-bold uppercase tracking-widest text-slate-950">TAP NOW!</span>}
                         {reactionState === 'result' && <span className="text-3xl font-bold text-white">{reactionScore}ms</span>}
                         {reactionState === 'fail' && <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Too early! Wait for the signal.</span>}
                         {reactionState === 'complete' && <CheckCircle2 className="h-16 w-16 text-emerald-500" />}
                       </div>

                       <div className="flex gap-4">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className={`h-2 w-12 rounded-full transition-all ${reactionTrials[i] ? 'bg-primary' : 'bg-white/5'}`}>
                              {reactionTrials[i] && <span className="block text-[7px] text-primary font-bold text-center mt-3">{reactionTrials[i]}ms</span>}
                            </div>
                          ))}
                       </div>
                    </div>
                  )}

                  {/* Step 1: Training Load */}
                  {currentStep === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-3">
                          <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">What is your current competitive level?</Label>
                          <select {...register("playingLevel")} className="w-full h-16 bg-slate-950/50 border-2 border-slate-800 text-white rounded-2xl px-6 focus:ring-primary outline-none text-sm font-bold uppercase">
                             {["Recreational", "School", "District", "State", "National", "Professional"].map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                       </div>
                       <div className="space-y-3">
                          <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">How many days a week do you train?</Label>
                          <div className="grid grid-cols-3 gap-3">
                             {["1-3 days", "4-6 days", "Daily"].map(f => (
                               <button key={f} type="button" onClick={() => setValue('trainingFrequency', f as any)} 
                                 className={`h-16 rounded-2xl border-2 font-bold uppercase text-[10px] tracking-widest transition-all ${watch('trainingFrequency') === f ? 'border-primary bg-primary text-slate-950' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
                                 {f}
                               </button>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-3">
                          <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">What is your typical intensity during training?</Label>
                          <div className="grid grid-cols-3 gap-3">
                             {["Low", "Moderate", "High"].map(i => (
                               <button key={i} type="button" onClick={() => setValue('avgIntensity', i as any)} 
                                 className={`h-16 rounded-2xl border-2 font-bold uppercase text-[10px] tracking-widest transition-all ${watch('avgIntensity') === i ? 'border-primary bg-primary text-slate-950' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
                                 {i}
                               </button>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-6">
                           <div className="flex justify-between items-center mb-2">
                             <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">How many hours do you train per week?</Label>
                             <span className="text-2xl font-black text-primary bg-primary/10 px-4 py-1 rounded-lg border border-primary/20">{Number(watch('typicalWeeklyHours'))}h</span>
                           </div>
                           <input 
                             type="range" 
                             min="1" 
                             max="40" 
                             step="1"
                             {...register("typicalWeeklyHours")}
                             className="w-full h-12 bg-slate-950/50 border-2 border-slate-800 rounded-full appearance-none cursor-pointer accent-primary px-4"
                           />
                           <div className="flex justify-between px-2 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                             <span>Light</span>
                             <span>Moderate</span>
                             <span>Intense</span>
                             <span>Elite</span>
                           </div>
                       </div>

                       <div className="space-y-6 col-span-1 md:col-span-2">
                           <div className="flex justify-between items-center mb-4">
                             <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">How exerted do you feel after a training session?</Label>
                             <div className="flex flex-col items-end">
                               <span className="text-2xl font-black text-primary bg-primary/10 px-4 py-1 rounded-lg border border-primary/20">{Number(watch('typicalRPE'))}</span>
                               <span className="text-[9px] font-bold text-slate-500 uppercase mt-1">
                                 {Number(watch('typicalRPE')) >= 10 ? 'Max Effort' :
                                  Number(watch('typicalRPE')) >= 9 ? 'Very Hard' :
                                  Number(watch('typicalRPE')) >= 7 ? 'Vigorous' :
                                  Number(watch('typicalRPE')) >= 4 ? 'Moderate' :
                                  Number(watch('typicalRPE')) >= 2 ? 'Light' : 'Very Light'}
                               </span>
                             </div>
                           </div>
                           <input 
                             type="range" 
                             min="1" 
                             max="10" 
                             step="1"
                             {...register("typicalRPE")}
                             className="w-full h-12 bg-slate-950/50 border-2 border-slate-800 rounded-full appearance-none cursor-pointer accent-primary px-4"
                           />
                           <div className="flex justify-between px-2 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                             <span>Very Light</span>
                             <span>Moderate</span>
                             <span>Max Effort</span>
                           </div>
                           <div className="mt-2 p-4 bg-slate-900/40 border border-slate-800/50 rounded-2xl">
                             <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic text-center">
                                {Number(watch('typicalRPE')) === 10 && "Max Effort: Almost impossible to keep going. Completely out of breath."}
                                {Number(watch('typicalRPE')) === 9 && "Very Hard: Very difficult to maintain intensity. Barely able to speak."}
                                {Number(watch('typicalRPE')) === 8 && "Vigorous: On the verge of becoming uncomfortable."}
                                {Number(watch('typicalRPE')) === 7 && "Vigorous: Short of breath. Can speak a sentence."}
                                {Number(watch('typicalRPE')) === 6 && "Moderate: High-end activity. Can hold a short conversation."}
                                {Number(watch('typicalRPE')) === 5 && "Moderate: Breathing heavily. Can exercise for hours."}
                                {Number(watch('typicalRPE')) === 4 && "Moderate: Feels like you can exercise for hours."}
                                {Number(watch('typicalRPE')) === 3 && "Light: Easy to breathe and carry a full conversation."}
                                {Number(watch('typicalRPE')) === 2 && "Light: Feels like you can maintain for hours."}
                                {Number(watch('typicalRPE')) === 1 && "Very Light: Anything other than sleeping (e.g. watching TV)."}
                             </p>
                           </div>
                       </div>
                    </div>
                  )}

                  {/* Step 2: Your Goal */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                       <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block text-center mb-8">What do you want Creeda to help you achieve?</Label>
                       <div className="grid grid-cols-1 gap-4">
                          {[
                            { value: "Performance Enhancement", desc: "Creeda will track your readiness, optimise your training loads, and push you toward peak performance with precision intelligence." },
                            { value: "Injury Prevention", desc: "Creeda will monitor your body's stress signals, flag injury risks early, and guide you with protective training adjustments." },
                            { value: "Recovery Efficiency", desc: "Creeda will analyse your recovery patterns, optimise rest periods, and ensure you're fully recharged for every session." },
                            { value: "Return from Injury", desc: "Creeda will build a safe, progressive return-to-play plan, tracking your healing markers and readiness at every stage." },
                            { value: "Competition Prep", desc: "Creeda will periodise your build-up, manage taper phases, and ensure you peak on the day that matters most." }
                          ].map(g => (
                            <button key={g.value} type="button" onClick={() => setValue('primaryGoal', g.value as any)} 
                              className={`p-6 rounded-3xl border-2 text-left transition-all ${watch('primaryGoal') === g.value ? 'border-primary bg-primary/5 shadow-xl' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-lg font-bold ${watch('primaryGoal') === g.value ? 'text-primary' : ''}`}>{g.value}</span>
                                {watch('primaryGoal') === g.value && <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />}
                              </div>
                              <p className={`text-[10px] leading-relaxed ${watch('primaryGoal') === g.value ? 'text-slate-300' : 'text-slate-500'}`}>{g.desc}</p>
                            </button>
                          ))}
                       </div>
                    </div>
                  )}

                  {/* Step 3: Injury History */}
                  {currentStep === 3 && (
                    <div className="space-y-10">
                       {/* --- Active Injury Status --- */}
                       <div className="space-y-6">
                          <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Active Injury Status</Label>
                          <div className="grid grid-cols-2 gap-4">
                             {["No", "Yes"].map(v => (
                               <button key={v} type="button" onClick={() => { setValue('currentIssue', v as any); if (v === 'No') { setActiveInjuries([]); setValue('activeInjuries', [] as any); } }} 
                                 className={`h-16 rounded-2xl border-2 font-bold uppercase text-[10px] tracking-widest transition-all ${watch('currentIssue') === v ? 'border-primary bg-primary text-slate-950' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
                                 {v === "Yes" ? "Currently Injured" : "No Active Injury"}
                               </button>
                             ))}
                          </div>
                          {watch('currentIssue') === "Yes" && (
                            <div className="space-y-4 mt-4">
                              {activeInjuries.map((entry, idx) => (
                                <div key={idx} className="p-5 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-4 relative group">
                                  <button type="button" onClick={() => { const updated = activeInjuries.filter((_, i) => i !== idx); setActiveInjuries(updated); setValue('activeInjuries', updated as any); }}
                                    className="absolute top-3 right-3 h-7 w-7 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500/20">
                                    <X size={12} />
                                  </button>
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Injury {idx + 1}</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <select value={entry.region} onChange={e => { const updated = [...activeInjuries]; updated[idx] = { ...updated[idx], region: e.target.value }; setActiveInjuries(updated); setValue('activeInjuries', updated as any); }}
                                      className="h-12 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 text-xs font-bold outline-none focus:border-primary">
                                      <option value="">Select Region</option>
                                      {INJURY_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <select value={entry.type} onChange={e => { const updated = [...activeInjuries]; updated[idx] = { ...updated[idx], type: e.target.value }; setActiveInjuries(updated); setValue('activeInjuries', updated as any); }}
                                      className="h-12 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 text-xs font-bold outline-none focus:border-primary">
                                      <option value="">Injury Type</option>
                                      {INJURY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <select value={entry.side} onChange={e => { const updated = [...activeInjuries]; updated[idx] = { ...updated[idx], side: e.target.value }; setActiveInjuries(updated); setValue('activeInjuries', updated as any); }}
                                      className="h-12 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 text-xs font-bold outline-none focus:border-primary">
                                      <option value="">Left / Right</option>
                                      {INJURY_SIDES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <button type="button" onClick={() => { const updated = [...activeInjuries]; updated[idx] = { ...updated[idx], recurring: !updated[idx].recurring }; setActiveInjuries(updated); setValue('activeInjuries', updated as any); }}
                                      className={`h-12 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${entry.recurring ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'}`}>
                                      {entry.recurring ? "⟳ Recurring" : "Not Recurring"}
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <button type="button" onClick={() => { const updated = [...activeInjuries, { region: '', type: '', side: '', recurring: false }]; setActiveInjuries(updated); setValue('activeInjuries', updated as any); }}
                                className="w-full h-14 rounded-2xl border-2 border-dashed border-slate-700 text-slate-400 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                                <PlusCircle size={14} /> Add Injury
                              </button>
                            </div>
                          )}
                       </div>

                       {/* --- Medical Conditions --- */}
                       <div className="space-y-6">
                          <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Medical Conditions / Illnesses</Label>
                          <div className="grid grid-cols-2 gap-4">
                             {["No", "Yes"].map(v => (
                               <button key={v} type="button" onClick={() => { setValue('hasIllness', v as any); if (v === 'No') { setIllnesses([]); setValue('illnesses', [] as any); } }} 
                                 className={`h-16 rounded-2xl border-2 font-bold uppercase text-[10px] tracking-widest transition-all ${watch('hasIllness') === v ? 'border-primary bg-primary text-slate-950' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
                                 {v === "Yes" ? "Yes, I have an illness" : "No Illnesses"}
                               </button>
                             ))}
                          </div>
                          {watch('hasIllness') === "Yes" && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                               {MEDICAL_CONDITIONS.map(condition => {
                                 const isSelected = illnesses.includes(condition);
                                 return (
                                   <button key={condition} type="button" 
                                     onClick={() => {
                                       const updated = isSelected 
                                         ? illnesses.filter(c => c !== condition) 
                                         : [...illnesses, condition];
                                       setIllnesses(updated);
                                       setValue('illnesses', updated as any);
                                     }}
                                     className={`h-12 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
                                     {condition}
                                   </button>
                                 )
                               })}
                            </div>
                          )}
                       </div>

                       {/* --- Past Injury History --- */}
                       <div className="space-y-6">
                          <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Past Injury History (Last 6 Months)</Label>
                          <div className="grid grid-cols-2 gap-4">
                             {["No", "Yes"].map(v => (
                               <button key={v} type="button" onClick={() => { setValue('pastMajorInjury', v as any); if (v === 'No') { setPastInjuries([]); setValue('pastInjuries', [] as any); } }} 
                                 className={`h-16 rounded-2xl border-2 font-bold uppercase text-[10px] tracking-widest transition-all ${watch('pastMajorInjury') === v ? 'border-primary bg-primary text-slate-950' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
                                 {v === "Yes" ? "Yes, Past Injuries" : "No Past Injuries"}
                               </button>
                             ))}
                          </div>
                          {watch('pastMajorInjury') === "Yes" && (
                            <div className="space-y-4 mt-4">
                              {pastInjuries.map((entry, idx) => (
                                <div key={idx} className="p-5 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-4 relative group">
                                  <button type="button" onClick={() => { const updated = pastInjuries.filter((_, i) => i !== idx); setPastInjuries(updated); setValue('pastInjuries', updated as any); }}
                                    className="absolute top-3 right-3 h-7 w-7 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500/20">
                                    <X size={12} />
                                  </button>
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Past Injury {idx + 1}</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <select value={entry.region} onChange={e => { const updated = [...pastInjuries]; updated[idx] = { ...updated[idx], region: e.target.value }; setPastInjuries(updated); setValue('pastInjuries', updated as any); }}
                                      className="h-12 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 text-xs font-bold outline-none focus:border-primary">
                                      <option value="">Select Region</option>
                                      {INJURY_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <select value={entry.type} onChange={e => { const updated = [...pastInjuries]; updated[idx] = { ...updated[idx], type: e.target.value }; setPastInjuries(updated); setValue('pastInjuries', updated as any); }}
                                      className="h-12 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 text-xs font-bold outline-none focus:border-primary">
                                      <option value="">Injury Type</option>
                                      {INJURY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <select value={entry.side} onChange={e => { const updated = [...pastInjuries]; updated[idx] = { ...updated[idx], side: e.target.value }; setPastInjuries(updated); setValue('pastInjuries', updated as any); }}
                                      className="h-12 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 text-xs font-bold outline-none focus:border-primary">
                                      <option value="">Left / Right</option>
                                      {INJURY_SIDES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <button type="button" onClick={() => { const updated = [...pastInjuries]; updated[idx] = { ...updated[idx], recurring: !updated[idx].recurring }; setPastInjuries(updated); setValue('pastInjuries', updated as any); }}
                                      className={`h-12 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${entry.recurring ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'}`}>
                                      {entry.recurring ? "⟳ Recurring" : "Not Recurring"}
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <button type="button" onClick={() => { const updated = [...pastInjuries, { region: '', type: '', side: '', recurring: false }]; setPastInjuries(updated); setValue('pastInjuries', updated as any); }}
                                className="w-full h-14 rounded-2xl border-2 border-dashed border-slate-700 text-slate-400 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                                <PlusCircle size={14} /> Add Past Injury
                              </button>
                            </div>
                          )}
                       </div>
                    </div>
                  )}

                  {/* Steps 4-12: Neural Check (Physiology Profiling) */}
                  {currentStep >= 4 && currentStep <= 12 && (
                    <div className="space-y-12 animate-fade-in">
                        {(() => {
                           const schemaKeys = [
                             "endurance_capacity", "strength_capacity", "explosive_power", 
                             "agility_control", "recovery_efficiency", 
                             "fatigue_resistance", "load_tolerance", "movement_robustness", "coordination_control"
                           ]
                           const key = schemaKeys[currentStep - 4] as keyof OnboardingValues

                           const questions: Record<string, { question: string; description: string; options: string[] }> = {
                             endurance_capacity: {
                               question: "How far can you run without stopping?",
                               description: "At a comfortable pace, no walking breaks.",
                               options: ["Under 1 km", "1 – 3 km", "3 – 8 km", "8+ km with ease"]
                             },
                             strength_capacity: {
                               question: "How many push-ups can you do in one go?",
                               description: "Full range, non-stop, at a steady pace.",
                               options: ["Fewer than 10", "10 – 25", "25 – 40", "40+ without breaking form"]
                             },
                             explosive_power: {
                               question: "How much force can you produce in a single effort?",
                               description: "Think about a max jump, a hard throw, or a powerful kick.",
                               options: ["I lack power in explosive efforts", "I generate moderate force", "I produce strong, powerful efforts", "I generate exceptional force on demand"]
                             },
                             agility_control: {
                               question: "How well can you dodge and weave through obstacles?",
                               description: "Think about navigating through cones, defenders, or tight spaces at pace.",
                               options: ["I'm stiff and predictable", "I manage basic lateral movement", "I'm nimble and can read spaces", "I move fluidly in any direction at pace"]
                             },
                             recovery_efficiency: {
                               question: "How do you feel the day after an intense session?",
                               description: "Think about soreness, energy, and readiness to train again.",
                               options: ["Very sore, need 2–3 days off", "Noticeably sore, need a light day", "Mildly sore, could train again", "Barely feel it, ready to go"]
                             },
                             fatigue_resistance: {
                               question: "How does your performance change in the last quarter of a game or session?",
                               description: "Compare your effort in the final 15 minutes vs the first 15.",
                               options: ["Drops off significantly", "Noticeably slower and weaker", "Slight dip but still effective", "I maintain my level throughout"]
                             },
                             load_tolerance: {
                               question: "How many intense sessions can you handle per week?",
                               description: "Sessions where you're pushing close to your limit.",
                               options: ["1 – 2 sessions max", "3 sessions comfortably", "4 – 5 sessions comfortably", "6+ sessions without issue"]
                             },
                             movement_robustness: {
                               question: "How well does your body move through its full range of motion?",
                               description: "Think about touching your toes, deep squats, or overhead reaches.",
                               options: ["Very stiff and restricted", "Limited in some joints", "Good range in most movements", "Full unrestricted range everywhere"]
                             },
                             coordination_control: {
                               question: "How well can you control your body during complex movements?",
                               description: "Think about balancing on one leg, landing from a jump, or multi-step drills.",
                               options: ["I wobble and lose balance often", "I'm stable in basic positions", "I'm controlled in most movements", "I have precise control in all positions"]
                             }
                           }

                           const q = questions[key as string]
                           
                           return (
                             <div className="space-y-8">
                                <div className="text-center space-y-4">
                                   <p className="text-[10px] text-primary font-bold uppercase tracking-[0.4em]">About You — {currentStep - 3} of 9</p>
                                   <h3 className="text-3xl font-bold text-white">{q.question}</h3>
                                   <p className="text-slate-400 text-sm font-medium max-w-md mx-auto">
                                      {q.description}
                                   </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                                   {[1, 2, 3, 4].map(val => (
                                     <button
                                       key={val}
                                       type="button"
                                       onClick={() => setValue(key as any, val)}
                                       className={`h-20 md:h-24 rounded-2xl border-2 flex items-center gap-4 px-6 transition-all text-left
                                         ${watch(key as any) === val ? 'border-primary bg-primary shadow-lg shadow-primary/20' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}
                                       `}
                                     >
                                        <span className={`text-2xl font-bold shrink-0 ${watch(key as any) === val ? 'text-slate-950' : 'text-white/30'}`}>{val}</span>
                                        <span className={`text-xs font-bold leading-snug ${watch(key as any) === val ? 'text-slate-950' : 'text-slate-300'}`}>
                                           {q.options[val - 1]}
                                        </span>
                                     </button>
                                   ))}
                                </div>

                                <div className="flex justify-center gap-2 mt-12">
                                   {schemaKeys.map((_, i) => (
                                      <div key={i} className={`h-1 w-8 rounded-full transition-all ${currentStep - 4 === i ? 'bg-primary w-12' : 'bg-white/5'}`} />
                                   ))}
                                </div>
                             </div>
                           )
                        })()}
                    </div>
                  )}

                  {/* Step 14: Wellness Sync */}
                  {currentStep === 14 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-3">
                          <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Typical Sleep Duration</Label>
                          <select {...register("typicalSleep")} className="w-full h-16 bg-slate-950/50 border-2 border-slate-800 text-white rounded-2xl px-6 focus:ring-primary outline-none text-sm font-bold uppercase">
                             {["< 6 hours", "6-7 hours", "7-8 hours", "8-9 hours", "> 9 hours"].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                       </div>

                       <div className="space-y-3">
                          <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Typical Soreness</Label>
                          <div className="grid grid-cols-4 gap-2">
                             {["None", "Low", "Moderate", "High"].map(s => (
                               <button key={s} type="button" onClick={() => setValue('typicalSoreness', s as any)} 
                                 className={`h-16 rounded-2xl border-2 font-bold uppercase text-[8px] tracking-widest transition-all ${watch('typicalSoreness') === s ? 'border-primary bg-primary text-slate-950' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
                                 {s}
                               </button>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-3">
                          <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Typical Energy Levels</Label>
                          <div className="grid grid-cols-3 gap-3">
                             {["Low", "Moderate", "High"].map(e => (
                               <button key={e} type="button" onClick={() => setValue('typicalEnergy', e as any)} 
                                 className={`h-16 rounded-2xl border-2 font-bold uppercase text-[10px] tracking-widest transition-all ${watch('typicalEnergy') === e ? 'border-primary bg-primary text-slate-950' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
                                 {e}
                               </button>
                             ))}
                          </div>
                       </div>
                    </div>
                  )}

                   {/* Step 15: Consent */}
                  {currentStep === 15 && (
                    <div className="space-y-10">
                       <div className="p-8 rounded-3xl bg-slate-950/50 border border-slate-800 space-y-6">
                          <div className="flex items-center gap-4 text-primary">
                             <ShieldCheck className="h-8 w-8" />
                             <h3 className="text-xl font-bold uppercase tracking-tight">Terms of Service</h3>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed font-medium">
                             By clicking "Accept", you acknowledge that Creeda provides performance intelligence for informational purposes only. Consult a medical professional before engaging in high-intensity training.
                          </p>
                          <div className="flex items-center gap-4">
                             <input 
                               type="checkbox" 
                               id="legalConsent" 
                               {...register("legalConsent")}
                               className="h-6 w-6 rounded border-slate-800 bg-slate-950 text-primary focus:ring-primary"
                             />
                             <Label htmlFor="legalConsent" className="text-xs font-bold uppercase text-slate-300 cursor-pointer">
                                I Accept the Performance Intelligence Terms of Use
                             </Label>
                          </div>
                          {errors.legalConsent && <p className="text-[10px] text-red-500 font-bold">{errors.legalConsent.message}</p>}
                       </div>

                       {watch('age') < 18 && (
                         <div className="p-8 rounded-3xl border-2 border-amber-500/20 bg-amber-500/5 space-y-6">
                            <div className="flex items-center gap-4 text-amber-500">
                               <AlertTriangle className="h-8 w-8" />
                               <h3 className="text-xl font-bold uppercase tracking-tight">Guardian Authorization</h3>
                            </div>
                            <p className="text-xs text-amber-500/60 font-bold uppercase">
                               Athlete detected as MINOR. Guardian consent must be confirmed to proceed.
                            </p>
                            <div className="flex items-center gap-4">
                               <input 
                                 type="checkbox" 
                                 id="minorGuardianConsent" 
                                 {...register("minorGuardianConsent")}
                                 className="h-6 w-6 rounded border-amber-500/20 bg-slate-950 text-amber-500 focus:ring-amber-500"
                               />
                               <Label htmlFor="minorGuardianConsent" className="text-xs font-bold uppercase text-amber-500/80 cursor-pointer">
                                  I confirm Guardian Authorization exists
                               </Label>
                            </div>
                            {errors.minorGuardianConsent && <p className="text-[10px] text-red-500 font-bold">{errors.minorGuardianConsent.message}</p>}
                         </div>
                       )}
                    </div>
                  )}


                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-16 pt-10 border-t border-slate-800">
               <Button 
                 onClick={prevStep}
                 variant="outline"
                 className={`h-14 px-8 rounded-2xl border-slate-800 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all ${currentStep === 0 ? 'invisible' : ''}`}
               >
                 <ArrowLeft className="mr-3 h-4 w-4" /> Previous
               </Button>

               {currentStep === TOTAL_STEPS - 1 ? (
                 <Button 
                   onClick={() => onSubmit(watch())}
                   disabled={isSubmitting}
                   className="h-16 px-12 rounded-2xl bg-primary text-slate-950 font-bold uppercase tracking-widest text-[10px] hover:bg-white shadow-xl transition-all duration-500"
                 >
                    {isSubmitting ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-3 h-5 w-5" />}
                    Complete Profile
                 </Button>
               ) : (
                 <Button 
                   onClick={nextStep}
                   className="h-16 px-12 rounded-2xl bg-white text-slate-950 font-bold uppercase tracking-widest text-[10px] hover:bg-primary transition-all duration-500"
                 >
                    Next Phase <ArrowRight className="ml-3 h-4 w-4" />
                 </Button>
               )}
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
           <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.4em]">Creeda Performance Intelligence Platform</p>
        </div>
      </div>

      {/* Resume Progress Modal */}
      <AnimatePresence>
        {showResumeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 rounded-[2rem] p-12 border border-slate-800 shadow-2xl text-center space-y-8"
            >
              <div className="h-20 w-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary">
                <History size={40} />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-white uppercase tracking-tight">Resume Draft?</h2>
                <p className="text-sm text-slate-400 font-medium uppercase tracking-widest leading-relaxed">
                  We found a partially completed intelligence profile. Would you like to resume or start fresh?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={resetOnboarding}
                  variant="outline"
                  className="h-16 rounded-2xl border-slate-800 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-800"
                >
                  Start Fresh
                </Button>
                <Button 
                  onClick={resumeOnboarding}
                  className="h-16 rounded-2xl bg-primary text-slate-950 font-bold uppercase tracking-widest text-[10px] hover:bg-white shadow-xl"
                >
                  Resume Sync
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
