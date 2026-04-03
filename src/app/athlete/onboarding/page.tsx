'use client'
 
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { type DefaultValues, type FieldPath, type PathValue, type Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  ArrowRight, ArrowLeft, Activity, CheckCircle2, ShieldAlert,
  Moon, Target, History, AlertTriangle, Brain,
  Zap, Flame, ShieldCheck, PlusCircle, X, Loader2,
  type LucideIcon
} from 'lucide-react'
import { submitDiagnosticForm } from './actions'
import { SPORTS_DATABASE } from '@/lib/sport_intelligence'
import { SPORTS_LIST, type SportType } from '@/lib/constants'
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
  primarySport: z.enum(SPORTS_LIST),
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
  medicalDisclaimerConsent: z.boolean().refine(val => val === true, "Medical disclaimer acknowledgement is required"),
  dataProcessingConsent: z.boolean().refine(val => val === true, "Data processing consent is required"),
  aiAcknowledgementConsent: z.boolean().refine(val => val === true, "AI acknowledgement is required"),
  marketingConsent: z.boolean().default(false),
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
}).refine((data) => {
  if (data.age < 18 && !data.minorGuardianConsent) return false
  return true
}, {
  message: "Guardian or coach consent is required for athletes under 18",
  path: ["minorGuardianConsent"]
})

type OnboardingValues = z.infer<typeof onboardingSchema>
type InjuryEntry = z.infer<typeof injuryEntrySchema>
type PhysiologyKey = Exclude<keyof z.infer<typeof physiologySchema>, 'reaction_time_ms' | 'reaction_self_perception'>

const TOTAL_STEPS = 16
const DOMINANT_SIDE_OPTIONS = ['Left', 'Right', 'Both', 'Ambidextrous'] as const
const BIOLOGICAL_SEX_OPTIONS = ['Male', 'Female', 'Other'] as const
const TRAINING_FREQUENCY_OPTIONS = ['1-3 days', '4-6 days', 'Daily'] as const
const INTENSITY_OPTIONS = ['Low', 'Moderate', 'High'] as const
const PRIMARY_GOAL_OPTIONS = [
  { value: 'Performance Enhancement', desc: 'Get sharper daily readiness, training-load, and performance decisions.' },
  { value: 'Injury Prevention', desc: 'Spot risk earlier and make safer training adjustments.' },
  { value: 'Recovery Efficiency', desc: 'Recover better between sessions so you can train well again sooner.' },
  { value: 'Return from Injury', desc: 'Build a safer step-by-step return to full sport.' },
  { value: 'Competition Prep', desc: 'Plan the build-up so you arrive ready on the day that matters.' },
] as const
const YES_NO_OPTIONS = ['No', 'Yes'] as const
const TYPICAL_SLEEP_OPTIONS = ['< 6 hours', '6-7 hours', '7-8 hours', '8-9 hours', '> 9 hours'] as const
const TYPICAL_SORENESS_OPTIONS = ['None', 'Low', 'Moderate', 'High'] as const
const TYPICAL_ENERGY_OPTIONS = ['Low', 'Moderate', 'High'] as const

const STEP_FIELDS: Record<number, FieldPath<OnboardingValues>[]> = {
  0: ['fullName', 'username', 'age', 'biologicalSex', 'heightCm', 'weightKg', 'primarySport', 'position', 'dominantSide'],
  1: ['playingLevel', 'trainingFrequency', 'avgIntensity', 'typicalWeeklyHours', 'typicalRPE'],
  2: ['primaryGoal'],
  3: ['currentIssue', 'pastMajorInjury', 'hasIllness'],
  4: ['endurance_capacity'],
  5: ['strength_capacity'],
  6: ['explosive_power'],
  7: ['agility_control'],
  8: ['recovery_efficiency'],
  9: ['fatigue_resistance'],
  10: ['load_tolerance'],
  11: ['movement_robustness'],
  12: ['coordination_control'],
  13: ['reaction_time_ms'],
  14: ['typicalSleep', 'usualWakeUpTime', 'typicalSoreness', 'typicalEnergy'],
  15: [
    'legalConsent',
    'medicalDisclaimerConsent',
    'dataProcessingConsent',
    'aiAcknowledgementConsent',
    'marketingConsent',
    'minorGuardianConsent',
  ],
}

const PHYSIOLOGY_KEYS: PhysiologyKey[] = [
  'endurance_capacity',
  'strength_capacity',
  'explosive_power',
  'agility_control',
  'recovery_efficiency',
  'fatigue_resistance',
  'load_tolerance',
  'movement_robustness',
  'coordination_control',
]

const PHYSIOLOGY_QUESTIONS: Record<PhysiologyKey, { question: string; description: string; options: [string, string, string, string] }> = {
  endurance_capacity: {
    question: "How well do you hold your pace deep into a session or match?",
    description: "Think about your breathing, movement quality, and how much your level drops when you get tired.",
    options: ["I slow down quickly and need frequent breaks", "I can hold a basic level but I fade", "I hold my level well for most of the session", "I stay strong deep into the session and can still push at the end"],
  },
  strength_capacity: {
    question: "How strong do you feel when dealing with contact, resistance, or heavy effort?",
    description: "Think about gym work, body control, and how solid you feel in physical moments.",
    options: ["I feel underpowered and get moved easily", "I have some strength but it is inconsistent", "I feel strong in most situations", "I feel very strong and hard to move"],
  },
  explosive_power: {
    question: "How sharp is your first burst of speed or force?",
    description: "Think about jumps, first steps, quick accelerations, and powerful actions.",
    options: ["I feel slow off the mark", "I can generate power but it takes me time", "I usually feel quick and reactive", "I explode instantly and create separation fast"],
  },
  agility_control: {
    question: "How well do you change direction at speed?",
    description: "Think about footwork, cuts, and staying in control.",
    options: ["I'm stiff and predictable", "I manage basic lateral movement", "I'm nimble and can read spaces", "I move fluidly in any direction at pace"],
  },
  recovery_efficiency: {
    question: "How do you usually feel the day after a hard session?",
    description: "Think about soreness, energy, and readiness to go again.",
    options: ["Very sore, need 2–3 days off", "Noticeably sore, need a light day", "Mildly sore, could train again", "Barely feel it, ready to go"],
  },
  fatigue_resistance: {
    question: "When a session gets long, how well do you hold your level?",
    description: "Compare the end of the session to the start.",
    options: ["Drops off significantly", "Noticeably slower and weaker", "Slight dip but still effective", "I maintain my level throughout"],
  },
  load_tolerance: {
    question: "How much hard training can your body handle in a normal week?",
    description: "Think about tough sessions, not warm-ups or easy recovery work.",
    options: ["1 – 2 sessions max", "3 sessions comfortably", "4 – 5 sessions comfortably", "6+ sessions without issue"],
  },
  movement_robustness: {
    question: "How free and comfortable does your body move?",
    description: "Think about squats, reaching overhead, and joint stiffness.",
    options: ["Very stiff and restricted", "Limited in some joints", "Good range in most movements", "Full unrestricted range everywhere"],
  },
  coordination_control: {
    question: "How well do you stay in control during complex movement?",
    description: "Think about balance, landing, and multi-step movement.",
    options: ["I wobble and lose balance often", "I'm stable in basic positions", "I'm controlled in most movements", "I have precise control in all positions"],
  },
}

const createOnboardingDefaults = (overrides: Partial<DefaultValues<OnboardingValues>> = {}): DefaultValues<OnboardingValues> => ({
  fullName: '',
  username: '',
  age: 18,
  heightCm: 175,
  weightKg: 70,
  position: '',
  typicalWeeklyHours: 5,
  typicalRPE: 6,
  activeInjuries: [],
  pastInjuries: [],
  illnesses: [],
  usualWakeUpTime: '',
  legalConsent: false,
  medicalDisclaimerConsent: false,
  dataProcessingConsent: false,
  aiAcknowledgementConsent: false,
  marketingConsent: false,
  minorGuardianConsent: false,
  coachLockerCode: '',
  ...overrides,
})

// --- Step Configuration ---
const STEP_LABELS: Record<number, { title: string; subtitle: string; icon: LucideIcon }> = {
  0: { title: 'Athlete Profile', subtitle: 'Body, sport, position, and dominant side', icon: Zap },
  1: { title: 'Training Reality', subtitle: 'How often you train and how hard normal weeks feel', icon: Flame },
  2: { title: 'Your Main Goal', subtitle: 'What you want CREEDA to help with first', icon: Target },
  3: { title: 'Health And Injury', subtitle: 'Current issues, past injuries, and medical context', icon: ShieldAlert },
  4: { title: 'Current Capacity', subtitle: 'Endurance (1/9)', icon: Brain },
  5: { title: 'Current Capacity', subtitle: 'Strength (2/9)', icon: Brain },
  6: { title: 'Current Capacity', subtitle: 'Power (3/9)', icon: Brain },
  7: { title: 'Current Capacity', subtitle: 'Agility (4/9)', icon: Brain },
  8: { title: 'Current Capacity', subtitle: 'Recovery (5/9)', icon: Brain },
  9: { title: 'Current Capacity', subtitle: 'Fatigue resistance (6/9)', icon: Brain },
  10: { title: 'Current Capacity', subtitle: 'Weekly load tolerance (7/9)', icon: Brain },
  11: { title: 'Current Capacity', subtitle: 'Mobility (8/9)', icon: Brain },
  12: { title: 'Current Capacity', subtitle: 'Coordination (9/9)', icon: Brain },
  13: { title: 'Reaction Test', subtitle: 'Quick 3-trial reflex check', icon: Activity },
  14: { title: 'Normal Recovery Baseline', subtitle: 'Sleep, soreness, energy, and wake time', icon: Moon },
  15: { title: 'Consent & Authorization', subtitle: 'Review and accept terms', icon: ShieldCheck },
}

const STEP_PURPOSES: Record<number, { usedFor: string; note?: string }> = {
  0: {
    usedFor: 'Used to load the correct sport demands, position context, and body-size baseline.',
    note: 'Name and username help identity and reporting. Sport, position, age, sex, height, and weight shape the actual model.',
  },
  1: {
    usedFor: 'Used to seed your normal training load and stress baseline.',
    note: 'This step matters directly for workload context and early readiness calibration.',
  },
  2: {
    usedFor: 'Used to decide what CREEDA should optimize first.',
  },
  3: {
    usedFor: 'Used to tighten injury risk, rehab logic, and return-to-play safeguards.',
  },
  4: {
    usedFor: 'Used to estimate your current endurance baseline.',
  },
  5: {
    usedFor: 'Used to estimate your current strength baseline.',
  },
  6: {
    usedFor: 'Used to estimate your power and first-burst profile.',
  },
  7: {
    usedFor: 'Used to estimate agility and movement control.',
  },
  8: {
    usedFor: 'Used to estimate how quickly you usually bounce back after hard work.',
  },
  9: {
    usedFor: 'Used to estimate how well you hold your level when fatigue builds.',
  },
  10: {
    usedFor: 'Used to estimate how much weekly hard work your body can currently tolerate.',
  },
  11: {
    usedFor: 'Used to estimate mobility and movement freedom.',
  },
  12: {
    usedFor: 'Used to estimate balance, control, and coordination quality.',
  },
  13: {
    usedFor: 'Used to build your reaction-time baseline for nervous-system and freshness signals.',
    note: 'This is why the test needs 3 clean trials.',
  },
  14: {
    usedFor: 'Used as your normal recovery baseline before daily check-ins and device trend data take over.',
  },
  15: {
    usedFor: 'Required for consent and safe use. This step does not change performance scoring.',
  },
}

export default function AthleteOnboarding() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
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
  const [activeInjuries, setActiveInjuries] = useState<InjuryEntry[]>([])
  const [pastInjuries, setPastInjuries] = useState<InjuryEntry[]>([])
  const [illnesses, setIllnesses] = useState<string[]>([])

  const {
    register,
    trigger,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema) as Resolver<OnboardingValues>,
    defaultValues: createOnboardingDefaults(),
  })

  const formValues = watch()
  const { clearDraft } = useOnboardingPersistence(formValues, currentStep, isReady, userId)
  const selectedSport = formValues.primarySport
  const selectedDominantSide = formValues.dominantSide
  const selectedTrainingFrequency = formValues.trainingFrequency
  const selectedAvgIntensity = formValues.avgIntensity
  const selectedGoal = formValues.primaryGoal
  const selectedCurrentIssue = formValues.currentIssue
  const selectedHasIllness = formValues.hasIllness
  const selectedPastMajorInjury = formValues.pastMajorInjury
  const selectedTypicalSoreness = formValues.typicalSoreness
  const selectedTypicalEnergy = formValues.typicalEnergy
  const age = formValues.age
  const selectedPositionOptions = selectedSport ? SPORTS_DATABASE[selectedSport.toLowerCase()]?.positions || [] : []

  const setFormValue = <K extends FieldPath<OnboardingValues>>(field: K, value: PathValue<OnboardingValues, K>) => {
    setValue(field, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        // Clear any stale guest drafts when a real user logs in
        try { localStorage.removeItem('creeda_onboarding_draft_guest') } catch {}
        // Pre-fill name if available
        supabase.from('profiles').select('full_name').eq('id', user.id).single()
          .then(({ data }) => {
            if (data?.full_name && !formValues.fullName) {
              setValue('fullName', data.full_name, { shouldDirty: false })
            }
          })

        const coachLockerCode = typeof user.user_metadata?.coach_locker_code === 'string'
          ? user.user_metadata.coach_locker_code.trim().toUpperCase()
          : ''
        if (coachLockerCode && !formValues.coachLockerCode) {
          setValue('coachLockerCode', coachLockerCode, { shouldDirty: false })
        }
      }
      setUserLoaded(true)
    })
  }, [formValues.coachLockerCode, formValues.fullName, setValue])

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
  }, [currentStep, isReady, showResumeModal, userId, userLoaded])

  useEffect(() => {
    return () => {
      if (reactionDelayTimerRef.current) clearTimeout(reactionDelayTimerRef.current)
    }
  }, [])

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
    reset(createOnboardingDefaults({
      age: 25,
      heightCm: 180,
      weightKg: 75,
      typicalWeeklyHours: 8,
      typicalRPE: 7,
    }))
    setActiveInjuries([])
    setPastInjuries([])
    setIllnesses([])
    setReactionTrials([])
    setReactionScore(null)
    setReactionState('idle')
    setCurrentStep(0)
    setIsReady(true)
    setShowResumeModal(false)
    toast.success("Profile reset. Start fresh.")
  }

  const jumpToStep = (step: number) => {
    setCurrentStep(step)
    scrollToTop()
  }

  const nextStep = async () => {
    const fields = STEP_FIELDS[currentStep] ?? []

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
        typicalWeeklyMinutes: vals.typicalWeeklyHours * 60,
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
    } catch {
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
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Athlete performance setup</span>
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
            Athlete Setup
          </h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">Performance baseline setup</p>
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
                  <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Used For</p>
                    <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                      {STEP_PURPOSES[currentStep]?.usedFor}
                    </p>
                    {STEP_PURPOSES[currentStep]?.note && (
                      <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                        {STEP_PURPOSES[currentStep]?.note}
                      </p>
                    )}
                  </div>
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
                                const nextSport = e.target.value as SportType
                                setFormValue('primarySport', nextSport)
                                const sportKey = nextSport.toLowerCase()
                                const positions = SPORTS_DATABASE[sportKey]?.positions || []
                                if (positions.length > 0) {
                                  setFormValue('position', '')
                                } else {
                                  setFormValue('position', '')
                                }
                              }}
                              className="w-full h-16 bg-slate-950/50 border-2 border-slate-800 text-white rounded-2xl px-6 focus:ring-primary outline-none text-sm font-bold uppercase tracking-widest"
                            >
                               <option value="">Select sport</option>
                               {SPORTS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                         </div>
                         <div className="space-y-3">
                          <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Position</Label>
                            {(() => {
                               if (selectedPositionOptions.length > 0) {
                                 return (
                                   <select {...register("position")} className="w-full h-16 bg-slate-950/50 border-2 border-slate-800 text-white rounded-2xl px-6 focus:ring-primary outline-none text-sm font-bold uppercase">
                                      <option value="">Select position</option>
                                      {selectedPositionOptions.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                                   </select>
                                 )
                               }
                               return (
                                 <Input {...register("position")} className="h-16 bg-slate-950/50 border-slate-800 text-white rounded-2xl px-6 focus:ring-primary border-2 text-sm font-bold" placeholder="e.g. Forward / Defender" />
                               )
                            })()}
                         </div>
                       </div>

                       <div className="space-y-4">
                          <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Dominant Side</Label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                             {DOMINANT_SIDE_OPTIONS.map((side) => (
                               <button
                                 key={side}
                                 type="button"
                                 onClick={() => setFormValue('dominantSide', side)}
                                 className={`h-16 rounded-2xl border-2 font-bold uppercase text-[9px] tracking-widest transition-all ${
                                   selectedDominantSide === side
                                     ? 'border-primary bg-primary text-slate-950'
                                     : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                                 }`}
                               >
                                 {side}
                               </button>
                             ))}
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
                            <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center block">Biological Sex</Label>
                            <div className="grid grid-cols-3 gap-2">
                               {BIOLOGICAL_SEX_OPTIONS.map((s) => (
                                 <button key={s} type="button" onClick={() => setFormValue('biologicalSex', s)} 
                                   className={`h-16 rounded-2xl border-2 font-bold uppercase text-[9px] tracking-widest transition-all ${formValues.biologicalSex === s ? 'border-primary bg-primary text-slate-950' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
                                   {s === 'Male' ? 'Male' : s === 'Female' ? 'Female' : 'Other'}
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
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest">Optional: complete 3 successful trials if you want a baseline</p>
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
                          <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Current level</Label>
                          <select {...register("playingLevel")} className="w-full h-16 bg-slate-950/50 border-2 border-slate-800 text-white rounded-2xl px-6 focus:ring-primary outline-none text-sm font-bold uppercase">
                             <option value="">Select level</option>
                             {["Recreational", "School", "District", "State", "National", "Professional"].map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                       </div>
                       <div className="space-y-3">
                          <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Training days per week</Label>
                          <div className="grid grid-cols-3 gap-3">
                             {TRAINING_FREQUENCY_OPTIONS.map((f) => (
                               <button key={f} type="button" onClick={() => setFormValue('trainingFrequency', f)} 
                                 className={`h-16 rounded-2xl border-2 font-bold uppercase text-[10px] tracking-widest transition-all ${selectedTrainingFrequency === f ? 'border-primary bg-primary text-slate-950' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
                                 {f}
                               </button>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-3">
                          <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Typical session intensity</Label>
                          <div className="grid grid-cols-3 gap-3">
                             {INTENSITY_OPTIONS.map((i) => (
                               <button key={i} type="button" onClick={() => setFormValue('avgIntensity', i)} 
                                 className={`h-16 rounded-2xl border-2 font-bold uppercase text-[10px] tracking-widest transition-all ${selectedAvgIntensity === i ? 'border-primary bg-primary text-slate-950' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
                                 {i}
                               </button>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-6">
                           <div className="flex justify-between items-center mb-2">
                             <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Weekly training hours</Label>
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
                             <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">How hard does a normal hard session feel?</Label>
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
                          {PRIMARY_GOAL_OPTIONS.map((g) => (
                            <button key={g.value} type="button" onClick={() => setFormValue('primaryGoal', g.value)} 
                              className={`p-6 rounded-3xl border-2 text-left transition-all ${selectedGoal === g.value ? 'border-primary bg-primary/5 shadow-xl' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-lg font-bold ${selectedGoal === g.value ? 'text-primary' : ''}`}>{g.value}</span>
                                {selectedGoal === g.value && <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />}
                              </div>
                              <p className={`text-[10px] leading-relaxed ${selectedGoal === g.value ? 'text-slate-300' : 'text-slate-500'}`}>{g.desc}</p>
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
                             {YES_NO_OPTIONS.map((v) => (
                               <button key={v} type="button" onClick={() => { setFormValue('currentIssue', v); if (v === 'No') { setActiveInjuries([]); setFormValue('activeInjuries', []); } }} 
                                 className={`h-16 rounded-2xl border-2 font-bold uppercase text-[10px] tracking-widest transition-all ${selectedCurrentIssue === v ? 'border-primary bg-primary text-slate-950' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
                                 {v === "Yes" ? "Currently Injured" : "No Active Injury"}
                               </button>
                             ))}
                          </div>
                          {selectedCurrentIssue === "Yes" && (
                            <div className="space-y-4 mt-4">
                              {activeInjuries.map((entry, idx) => (
                                <div key={idx} className="p-5 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-4 relative group">
                                  <button type="button" onClick={() => { const updated = activeInjuries.filter((_, i) => i !== idx); setActiveInjuries(updated); setFormValue('activeInjuries', updated); }}
                                    className="absolute top-3 right-3 h-7 w-7 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500/20">
                                    <X size={12} />
                                  </button>
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Injury {idx + 1}</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <select value={entry.region} onChange={e => { const updated = [...activeInjuries]; updated[idx] = { ...updated[idx], region: e.target.value }; setActiveInjuries(updated); setFormValue('activeInjuries', updated); }}
                                      className="h-12 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 text-xs font-bold outline-none focus:border-primary">
                                      <option value="">Select Region</option>
                                      {INJURY_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <select value={entry.type} onChange={e => { const updated = [...activeInjuries]; updated[idx] = { ...updated[idx], type: e.target.value }; setActiveInjuries(updated); setFormValue('activeInjuries', updated); }}
                                      className="h-12 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 text-xs font-bold outline-none focus:border-primary">
                                      <option value="">Injury Type</option>
                                      {INJURY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <select value={entry.side} onChange={e => { const updated = [...activeInjuries]; updated[idx] = { ...updated[idx], side: e.target.value }; setActiveInjuries(updated); setFormValue('activeInjuries', updated); }}
                                      className="h-12 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 text-xs font-bold outline-none focus:border-primary">
                                      <option value="">Left / Right</option>
                                      {INJURY_SIDES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <button type="button" onClick={() => { const updated = [...activeInjuries]; updated[idx] = { ...updated[idx], recurring: !updated[idx].recurring }; setActiveInjuries(updated); setFormValue('activeInjuries', updated); }}
                                      className={`h-12 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${entry.recurring ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'}`}>
                                      {entry.recurring ? "⟳ Recurring" : "Not Recurring"}
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <button type="button" onClick={() => { const updated = [...activeInjuries, { region: '', type: '', side: '', recurring: false }]; setActiveInjuries(updated); setFormValue('activeInjuries', updated); }}
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
                             {YES_NO_OPTIONS.map((v) => (
                               <button key={v} type="button" onClick={() => { setFormValue('hasIllness', v); if (v === 'No') { setIllnesses([]); setFormValue('illnesses', []); } }} 
                                 className={`h-16 rounded-2xl border-2 font-bold uppercase text-[10px] tracking-widest transition-all ${selectedHasIllness === v ? 'border-primary bg-primary text-slate-950' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
                                 {v === "Yes" ? "Yes, I have an illness" : "No Illnesses"}
                               </button>
                             ))}
                          </div>
                          {selectedHasIllness === "Yes" && (
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
                                       setFormValue('illnesses', updated);
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
                             {YES_NO_OPTIONS.map((v) => (
                               <button key={v} type="button" onClick={() => { setFormValue('pastMajorInjury', v); if (v === 'No') { setPastInjuries([]); setFormValue('pastInjuries', []); } }} 
                                 className={`h-16 rounded-2xl border-2 font-bold uppercase text-[10px] tracking-widest transition-all ${selectedPastMajorInjury === v ? 'border-primary bg-primary text-slate-950' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
                                 {v === "Yes" ? "Yes, Past Injuries" : "No Past Injuries"}
                               </button>
                             ))}
                          </div>
                          {selectedPastMajorInjury === "Yes" && (
                            <div className="space-y-4 mt-4">
                              {pastInjuries.map((entry, idx) => (
                                <div key={idx} className="p-5 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-4 relative group">
                                  <button type="button" onClick={() => { const updated = pastInjuries.filter((_, i) => i !== idx); setPastInjuries(updated); setFormValue('pastInjuries', updated); }}
                                    className="absolute top-3 right-3 h-7 w-7 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500/20">
                                    <X size={12} />
                                  </button>
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Past Injury {idx + 1}</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <select value={entry.region} onChange={e => { const updated = [...pastInjuries]; updated[idx] = { ...updated[idx], region: e.target.value }; setPastInjuries(updated); setFormValue('pastInjuries', updated); }}
                                      className="h-12 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 text-xs font-bold outline-none focus:border-primary">
                                      <option value="">Select Region</option>
                                      {INJURY_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <select value={entry.type} onChange={e => { const updated = [...pastInjuries]; updated[idx] = { ...updated[idx], type: e.target.value }; setPastInjuries(updated); setFormValue('pastInjuries', updated); }}
                                      className="h-12 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 text-xs font-bold outline-none focus:border-primary">
                                      <option value="">Injury Type</option>
                                      {INJURY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <select value={entry.side} onChange={e => { const updated = [...pastInjuries]; updated[idx] = { ...updated[idx], side: e.target.value }; setPastInjuries(updated); setFormValue('pastInjuries', updated); }}
                                      className="h-12 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 text-xs font-bold outline-none focus:border-primary">
                                      <option value="">Left / Right</option>
                                      {INJURY_SIDES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <button type="button" onClick={() => { const updated = [...pastInjuries]; updated[idx] = { ...updated[idx], recurring: !updated[idx].recurring }; setPastInjuries(updated); setFormValue('pastInjuries', updated); }}
                                      className={`h-12 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${entry.recurring ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'}`}>
                                      {entry.recurring ? "⟳ Recurring" : "Not Recurring"}
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <button type="button" onClick={() => { const updated = [...pastInjuries, { region: '', type: '', side: '', recurring: false }]; setPastInjuries(updated); setFormValue('pastInjuries', updated); }}
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
                           const key = PHYSIOLOGY_KEYS[currentStep - 4]
                           const q = PHYSIOLOGY_QUESTIONS[key]
                           const selectedValue = formValues[key]
                           
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
                                       onClick={() => setFormValue(key, val)}
                                       className={`h-20 md:h-24 rounded-2xl border-2 flex items-center gap-4 px-6 transition-all text-left
                                         ${selectedValue === val ? 'border-primary bg-primary shadow-lg shadow-primary/20' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}
                                       `}
                                     >
                                        <span className={`text-2xl font-bold shrink-0 ${selectedValue === val ? 'text-slate-950' : 'text-white/30'}`}>{val}</span>
                                        <span className={`text-xs font-bold leading-snug ${selectedValue === val ? 'text-slate-950' : 'text-slate-300'}`}>
                                           {q.options[val - 1]}
                                        </span>
                                     </button>
                                   ))}
                                </div>

                                <div className="flex justify-center gap-2 mt-12">
                                   {PHYSIOLOGY_KEYS.map((_, i) => (
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
                             <option value="">Select sleep range</option>
                             {TYPICAL_SLEEP_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                       </div>

                       <div className="space-y-3">
                          <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Usual Wake-Up Time</Label>
                          <Input
                            type="time"
                            {...register("usualWakeUpTime")}
                            className="h-16 bg-slate-950/50 border-slate-800 text-white rounded-2xl px-6 focus:ring-primary border-2 text-lg font-bold"
                          />
                       </div>

                       <div className="space-y-3">
                          <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Typical Soreness</Label>
                          <div className="grid grid-cols-4 gap-2">
                             {TYPICAL_SORENESS_OPTIONS.map((s) => (
                               <button key={s} type="button" onClick={() => setFormValue('typicalSoreness', s)} 
                                 className={`h-16 rounded-2xl border-2 font-bold uppercase text-[8px] tracking-widest transition-all ${selectedTypicalSoreness === s ? 'border-primary bg-primary text-slate-950' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
                                 {s}
                               </button>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-3">
                          <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Typical Energy Levels</Label>
                          <div className="grid grid-cols-3 gap-3">
                             {TYPICAL_ENERGY_OPTIONS.map((e) => (
                               <button key={e} type="button" onClick={() => setFormValue('typicalEnergy', e)} 
                                 className={`h-16 rounded-2xl border-2 font-bold uppercase text-[10px] tracking-widest transition-all ${selectedTypicalEnergy === e ? 'border-primary bg-primary text-slate-950' : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'}`}>
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
                             Before finishing onboarding, review and accept each legal acknowledgement. CREEDA is a decision-support system for sports science and healthy living.
                          </p>
                          <div className="space-y-4">
                            <div className="flex items-start gap-4">
                              <input
                                type="checkbox"
                                id="legalConsent"
                                {...register("legalConsent")}
                                className="mt-1 h-6 w-6 rounded border-slate-800 bg-slate-950 text-primary focus:ring-primary"
                              />
                              <Label htmlFor="legalConsent" className="text-xs font-bold uppercase text-slate-300 cursor-pointer leading-relaxed">
                                I accept the <Link href="/terms" target="_blank" className="text-primary underline">Terms</Link> and <Link href="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link>.
                              </Label>
                            </div>
                            {errors.legalConsent && <p className="text-[10px] text-red-500 font-bold">{errors.legalConsent.message}</p>}

                            <div className="flex items-start gap-4">
                              <input
                                type="checkbox"
                                id="medicalDisclaimerConsent"
                                {...register("medicalDisclaimerConsent")}
                                className="mt-1 h-6 w-6 rounded border-slate-800 bg-slate-950 text-primary focus:ring-primary"
                              />
                              <Label htmlFor="medicalDisclaimerConsent" className="text-xs font-bold uppercase text-slate-300 cursor-pointer leading-relaxed">
                                I acknowledge the <Link href="/disclaimer" target="_blank" className="text-primary underline">Medical Disclaimer</Link>. CREEDA does not replace qualified medical care.
                              </Label>
                            </div>
                            {errors.medicalDisclaimerConsent && <p className="text-[10px] text-red-500 font-bold">{errors.medicalDisclaimerConsent.message}</p>}

                            <div className="flex items-start gap-4">
                              <input
                                type="checkbox"
                                id="dataProcessingConsent"
                                {...register("dataProcessingConsent")}
                                className="mt-1 h-6 w-6 rounded border-slate-800 bg-slate-950 text-primary focus:ring-primary"
                              />
                              <Label htmlFor="dataProcessingConsent" className="text-xs font-bold uppercase text-slate-300 cursor-pointer leading-relaxed">
                                I give explicit consent for processing my performance and wellness data as described in <Link href="/consent" target="_blank" className="text-primary underline">Consent Acknowledgement</Link> (DPDP/GDPR aligned).
                              </Label>
                            </div>
                            {errors.dataProcessingConsent && <p className="text-[10px] text-red-500 font-bold">{errors.dataProcessingConsent.message}</p>}

                            <div className="flex items-start gap-4">
                              <input
                                type="checkbox"
                                id="aiAcknowledgementConsent"
                                {...register("aiAcknowledgementConsent")}
                                className="mt-1 h-6 w-6 rounded border-slate-800 bg-slate-950 text-primary focus:ring-primary"
                              />
                              <Label htmlFor="aiAcknowledgementConsent" className="text-xs font-bold uppercase text-slate-300 cursor-pointer leading-relaxed">
                                I understand AI outputs are advisory and probabilistic, as explained in <Link href="/ai-transparency" target="_blank" className="text-primary underline">AI Transparency</Link>.
                              </Label>
                            </div>
                            {errors.aiAcknowledgementConsent && <p className="text-[10px] text-red-500 font-bold">{errors.aiAcknowledgementConsent.message}</p>}

                            <div className="pt-2 border-t border-slate-800">
                              <div className="flex items-start gap-4">
                                <input
                                  type="checkbox"
                                  id="marketingConsent"
                                  {...register("marketingConsent")}
                                  className="mt-1 h-6 w-6 rounded border-slate-800 bg-slate-950 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="marketingConsent" className="text-xs font-bold uppercase text-slate-400 cursor-pointer leading-relaxed">
                                  Optional: send me product updates and educational messages. I can change this later in Legal & Privacy settings.
                                </Label>
                              </div>
                            </div>
                          </div>
                       </div>

                       {age < 18 && (
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
