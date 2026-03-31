'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signup, verifyLockerCode } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { scrollToTop } from '@/lib/utils'
import { Loader2, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle2, Zap } from 'lucide-react'
import { toast } from 'sonner'

function SignupForm() {
  const searchParams = useSearchParams()
  const requestedRole = searchParams.get('role')
  const initialRole =
    requestedRole === 'athlete' || requestedRole === 'coach' || requestedRole === 'individual'
      ? requestedRole
      : 'individual'
  const coachLockerCode = searchParams.get('coach') || ''
  const hasPresetRole = requestedRole === 'athlete' || requestedRole === 'coach' || requestedRole === 'individual'

  const [step, setStep] = useState(hasPresetRole ? 2 : 1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    scrollToTop()
  }, [step])
  const [loading, setLoading] = useState(false)
  
  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: initialRole,
    coach_locker_code: coachLockerCode
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [consent, setConsent] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [isCodeValid, setIsCodeValid] = useState<boolean | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [verifiedCoach, setVerifiedCoach] = useState<{ name: string } | null>(null)

  const roleMeta = {
    individual: {
      title: 'Individual',
      summary: 'FitStart, recovery, movement, sleep, stress, and healthier-living guidance for normal people.',
      heading: 'Start Your Healthy-Living Journey',
      phase: 'Phase 02: FitStart Access',
      cta: 'Continue to FitStart',
    },
    athlete: {
      title: 'Athlete',
      summary: 'Performance diagnostics, readiness, workload, rehab context, and sharper training decisions.',
      heading: 'Enter The Athlete System',
      phase: 'Phase 02: Performance Access',
      cta: 'Continue to Athlete Onboarding',
    },
    coach: {
      title: 'Coach',
      summary: 'Squad oversight, athlete monitoring, and decision support for coaches and practitioners.',
      heading: 'Create Your Coach Workspace',
      phase: 'Phase 02: Coach Access',
      cta: 'Create Coach Account',
    },
  } as const

  const activeRoleMeta = roleMeta[formData.role as keyof typeof roleMeta]

  const updateForm = (updates: Partial<typeof formData>) => {
    setFormData((prev: typeof formData) => ({ ...prev, ...updates }))
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    
    const submission = new FormData()
    submission.append('full_name', formData.full_name)
    submission.append('email', formData.email)
    submission.append('password', formData.password)
    submission.append('role', formData.role)
    submission.append('consent', consent ? 'on' : 'off')
    if (formData.coach_locker_code) {
      submission.append('coach_locker_code', formData.coach_locker_code)
    }

    const result = await signup(submission)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  const prevStep = () => {
    setStep((s: number) => s - 1)
  }

  const handleVerifyCode = async () => {
    if (!formData.coach_locker_code || formData.coach_locker_code.length !== 6) return
    
    setIsVerifyingCode(true)
    setIsCodeValid(null)
    setCodeError(null)
    
    try {
      const result = await verifyLockerCode(formData.coach_locker_code)
      if (result.success) {
        setIsCodeValid(true)
        setVerifiedCoach({ name: result.coach?.name || '' })
        toast.success(`Code Verified: Joined ${result.coach?.name}'s Squad`)
      } else {
        setIsCodeValid(false)
        setCodeError(result.error || 'Invalid code')
        toast.error(result.error || 'Invalid code')
      }
    } catch {
      setCodeError('Verification failed. Try again.')
    } finally {
      setIsVerifyingCode(false)
    }
  }

  return (
    <div className="relative max-w-xl mx-auto py-12 px-6 lg:px-8 z-10 animate-fade-up">
      {/* HUD Background Glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full" />
      </div>

      {/* Progress Bar */}
      <div className="mb-12 flex items-center justify-between gap-4">
        {[1, 2].map((s) => (
          <div 
            key={s} 
            className={`h-1 flex-1 rounded-full transition-all duration-700 ${
              s <= step ? 'bg-primary shadow-[0_0_10px_rgba(245,124,0,0.3)]' : 'bg-white/10'
            }`} 
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-10">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-black text-primary tracking-tighter uppercase mb-3 italic" style={{ fontFamily: 'var(--font-orbitron)' }}>
              Choose Your <span className="text-white">Journey</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic">Phase 01: Identification</p>
            <p className="text-sm text-white/45 mt-4 max-w-xl leading-relaxed">
              Individuals should enter a healthier-living coach. Athletes should enter a performance system. Pick the CREEDA journey you actually need.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => { updateForm({ role: 'individual' }); setStep(2); }}
              className={`group p-8 rounded-[2rem] border-2 text-left transition-all relative overflow-hidden backdrop-blur-xl ${
                formData.role === 'individual' ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
               <div className="relative z-10 space-y-3">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight italic text-white">Individual</h3>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-[0.25em]">Healthy living guidance</p>
                </div>
                <p className="text-xs text-white/45 leading-relaxed">
                  FitStart for real Indian routines, daily recovery guidance, movement habits, and a simpler path into fitness or sport.
                </p>
              </div>
            </button>

            <button
              onClick={() => { updateForm({ role: 'athlete' }); setStep(2); }}
              className={`group p-8 rounded-[2rem] border-2 text-left transition-all relative overflow-hidden backdrop-blur-xl ${
                formData.role === 'athlete' ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="relative z-10 space-y-3">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight italic text-white">Athlete</h3>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.25em]">Performance system</p>
                </div>
                <p className="text-xs text-white/45 leading-relaxed">
                  Deeper diagnostics, readiness, workload, rehab, and sharper decisions for training and competition.
                </p>
              </div>
            </button>

            <button
              onClick={() => { updateForm({ role: 'coach' }); setStep(2); }}
              className={`group p-8 rounded-[2rem] border-2 text-left transition-all relative overflow-hidden backdrop-blur-xl ${
                formData.role === 'coach' ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
               <div className="relative z-10 space-y-3">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight italic text-white">Coach</h3>
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.25em]">Squad intelligence</p>
                </div>
                <p className="text-xs text-white/45 leading-relaxed">
                  Team oversight, athlete monitoring, and performance communication for coaches and practitioners.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-10">
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.28em] text-white/50">
                {activeRoleMeta.title}
              </span>
            </div>
            <h1 className="text-3xl font-black text-primary tracking-tighter uppercase mb-3 italic" style={{ fontFamily: 'var(--font-orbitron)' }}>
              {activeRoleMeta.heading}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic">{activeRoleMeta.phase}</p>
            <p className="text-sm text-white/45 mt-4 max-w-xl leading-relaxed">
              {activeRoleMeta.summary}
            </p>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <Label htmlFor="full_name" className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Full Name</Label>
              <Input 
                id="full_name" 
                value={formData.full_name}
                onChange={e => updateForm({ full_name: e.target.value })}
                className="h-14 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 text-white font-bold"
                placeholder={formData.role === 'individual' ? 'Aarav M.' : formData.role === 'coach' ? 'Coach Mehra' : 'Sachin T.'} 
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Email Connection</Label>
              <Input 
                id="email" 
                type="email"
                value={formData.email}
                onChange={e => updateForm({ email: e.target.value })}
                className="h-14 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 text-white font-bold"
                placeholder={formData.role === 'individual' ? 'you@creeda.in' : formData.role === 'coach' ? 'coach@creeda.in' : 'athlete@creeda.in'} 
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" data-id="password-label" className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Security Access</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'} 
                  value={formData.password}
                  onChange={e => updateForm({ password: e.target.value })}
                  className="h-14 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 pr-12 text-white font-bold"
                  placeholder="••••••••" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Coach Locker Code - Athletes Only */}
            {formData.role === 'athlete' && (
              <div className="space-y-3">
                <Label htmlFor="coach_locker_code" className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Coach Locker Code <span className="text-white/30">(Optional)</span></Label>
                <div className="relative">
                  <Input 
                    id="coach_locker_code" 
                    value={formData.coach_locker_code}
                    onChange={e => {
                      const val = e.target.value.toUpperCase()
                      updateForm({ coach_locker_code: val })
                      setIsCodeValid(null)
                      setCodeError(null)
                      setVerifiedCoach(null)
                    }}
                    maxLength={6}
                    className={`h-14 rounded-2xl bg-white/5 border-white/10 focus:border-primary/50 text-white font-bold tracking-[0.3em] text-center uppercase ${
                      isCodeValid === true ? 'border-emerald-500/50 bg-emerald-500/5' : 
                      isCodeValid === false ? 'border-red-500/50 bg-red-500/5' : ''
                    }`}
                    placeholder="XXXXXX" 
                  />
                  {formData.coach_locker_code.length === 6 && !isVerifyingCode && isCodeValid === null && (
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-widest bg-primary/20 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/30 transition-all"
                    >
                      Verify
                    </button>
                  )}
                  {isVerifyingCode && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary animate-spin" />
                  )}
                  {isCodeValid === true && (
                    <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                  )}
                </div>
                {verifiedCoach && (
                  <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/80 ml-1">
                    ✓ Linked to Coach: {verifiedCoach.name}
                  </p>
                )}
                {codeError && (
                  <p className="text-[9px] font-bold uppercase tracking-widest text-red-500/80 ml-1">
                    {codeError}
                  </p>
                )}
                {!formData.coach_locker_code && (
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 ml-1">
                    If your coach gave you a code, enter it here to link your profile.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-start gap-4 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <input 
                type="checkbox" 
                id="consent" 
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary accent-primary cursor-pointer shrink-0"
              />
              <label htmlFor="consent" className="text-[9px] font-bold text-white/40 leading-relaxed uppercase tracking-tight cursor-pointer">
                I agree to the <Link href="/terms" target="_blank" className="text-primary underline hover:text-primary/80">Terms</Link> & <Link href="/privacy" target="_blank" className="text-primary underline hover:text-primary/80">Privacy Policy</Link>. CREEDA provides guidance and decision support, not medical diagnosis or treatment.
              </label>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold">
                {error}
              </div>
            )}

            <Button 
              onClick={handleSubmit}
              className="w-full h-16 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest shadow-2xl shadow-primary/10 active:scale-95 transition-all mt-4"
              disabled={loading || !formData.email || !formData.password || !formData.full_name || !consent}
            >
              {loading ? 'Completing Signup...' : activeRoleMeta.cta}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button variant="ghost" onClick={prevStep} className="w-full text-muted-foreground hover:text-primary hover:bg-primary/5 uppercase text-[10px] font-black tracking-widest">
              <ArrowLeft className="mr-2 h-4 w-4" /> Change Journey
            </Button>
          </div>
        </div>
      )}

      <p className="mt-12 text-center text-[10px] text-muted-foreground uppercase font-black tracking-widest">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="text-foreground text-center">Loading Performance Shield...</div>}>
      <SignupForm />
    </Suspense>
  )
}
