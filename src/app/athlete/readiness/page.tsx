'use client'

import { useState } from 'react'
import { calculateReadiness, WellnessInput, ReadinessResult } from '@/lib/readiness'
import { 
  Menu, Bolt, Activity, Calendar, User, ArrowLeft,
  ShieldAlert, LayoutDashboard, Settings, Plus, CheckCircle2
} from 'lucide-react'

// Custom Slider Component to match the "Kinetic" aesthetic
const Slider = ({ 
  label, value, min, max, onChange, icon 
}: { 
  label: string, value: number, min: number, max: number, onChange: (val: number) => void, icon: string 
}) => (
  <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/10">
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-sm">{icon}</span>
        </div>
        <span className="font-label text-xs font-bold tracking-widest text-secondary uppercase">{label}</span>
      </div>
      <span className="font-headline text-lg font-bold text-primary">{value}</span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      value={value} 
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
    />
    <div className="flex justify-between mt-2 text-[10px] font-bold text-secondary/50 uppercase tracking-tighter">
      <span>Min</span>
      <span>Max</span>
    </div>
  </div>
)

export default function ReadinessPage() {
  const [step, setStep] = useState<'input' | 'result'>('input')
  const [inputs, setInputs] = useState<WellnessInput>({
    sleep: 3,
    energy: 3,
    soreness: 3,
    stress: 3,
    intensity: 5,
    duration: 60
  })
  const [result, setResult] = useState<ReadinessResult | null>(null)

  const handleCheckReadiness = () => {
    const res = calculateReadiness(inputs)
    setResult(res)
    setStep('result')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getDescription = (score: number, decision: string) => {
    if (score >= 75) return "Your recovery metrics and sleep quality are optimal. Today is a prime opportunity for a high-intensity session."
    if (score >= 50) return "You are in a stable condition. A moderate session will keep your momentum without overtraining."
    return "Your system shows signs of fatigue or stress. Prioritize active recovery and quality sleep today."
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen selection:bg-primary-container selection:text-on-primary-container font-body">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-slate-50/80 backdrop-blur-xl flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-4">
          <button className="text-blue-600 hover:bg-slate-200/50 transition-colors p-2 rounded-xl active:scale-95 duration-200">
            <Menu size={24} />
          </button>
          <h1 className="text-2xl font-black tracking-tighter text-blue-600 uppercase font-headline">CREEDA</h1>
        </div>
        <div className="h-10 w-10 rounded-full bg-surface-container-highest overflow-hidden border-2 border-primary/10">
          <img 
            alt="Profile" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-e4yKmIVM18JP3L3YNZVnxzHTjHJC6bJWvzs4H7uVKPDv4VL7eN9rOGXBAeFAyiwPCHVma6Rr39X_19B1-QpXKdIEF8Nk5R1l6KjExyOOupey7tSX_qbHIHj49F_FogW140iJc6j4Ga0gS2ZqV_Bt5QuY5_5qCzD_HcB73C-YeNyq0T6X30nV-yTvTfstdVphYArdGimbaZ_OG4-46puLuw5jjJnw1Nh5tTmHRx6oWRy_62Ozog2KgrQvNh16VM6zcUYXXpZomw"
          />
        </div>
      </header>

      <main className="pt-24 pb-32 px-6 max-w-2xl mx-auto min-h-screen flex flex-col">
        {step === 'input' ? (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-10 text-center">
              <h2 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface mb-2">Check Readiness</h2>
              <p className="text-on-surface-variant text-sm font-medium">Log your current state to get training guidance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Slider 
                label="Sleep Quality" 
                value={inputs.sleep} 
                min={1} max={5} 
                icon="bedtime"
                onChange={(v) => setInputs({...inputs, sleep: v})} 
              />
              <Slider 
                label="Energy Level" 
                value={inputs.energy} 
                min={1} max={5} 
                icon="bolt"
                onChange={(v) => setInputs({...inputs, energy: v})} 
              />
              <Slider 
                label="Muscle Soreness" 
                value={inputs.soreness} 
                min={1} max={5} 
                icon="fitness_center"
                onChange={(v) => setInputs({...inputs, soreness: v})} 
              />
              <Slider 
                label="Stress Level" 
                value={inputs.stress} 
                min={1} max={5} 
                icon="psychology"
                onChange={(v) => setInputs({...inputs, stress: v})} 
              />
              <Slider 
                label="Target Intensity" 
                value={inputs.intensity} 
                min={1} max={10} 
                icon="speed"
                onChange={(v) => setInputs({...inputs, intensity: v})} 
              />
              
              <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                  </div>
                  <span className="font-label text-xs font-bold tracking-widest text-secondary uppercase">Duration</span>
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    value={inputs.duration}
                    onChange={(e) => setInputs({...inputs, duration: parseInt(e.target.value) || 0})}
                    className="w-full bg-surface-container-highest border-none rounded-2xl h-12 px-6 font-headline font-bold text-lg focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="absolute right-6 top-3 text-secondary/50 font-bold uppercase text-[10px] tracking-widest">MINS</span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleCheckReadiness}
              className="w-full h-16 bg-primary text-on-primary font-headline font-bold text-xl rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              Check Readiness
              <Activity className="w-6 h-6" />
            </button>
          </section>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-700">
            {/* Hero Section: The Score */}
            <section className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative mb-8">
                {/* Decorative Kinetic Ring */}
                <div className="absolute inset-0 rounded-full border-[12px] border-surface-container-low"></div>
                <div 
                  className={`absolute inset-0 rounded-full border-[12px] border-primary border-t-transparent -rotate-45 transition-all duration-1000 ease-out`}
                  style={{ transform: `rotate(${(result?.readiness_score || 0) * 3.6 - 45}deg)` }}
                ></div>
                <div className="w-64 h-64 flex flex-col items-center justify-center rounded-full bg-surface-container-lowest shadow-sm z-10 relative">
                  <span className="font-headline text-[100px] font-black leading-none tracking-tighter text-on-surface">
                    {result?.readiness_score}
                  </span>
                  <span className="font-label text-sm tracking-[0.2em] font-bold text-secondary uppercase -mt-2">Readiness Score</span>
                </div>
              </div>

              {/* Status & Decision */}
              <div className="space-y-4 mb-12">
                <div className={`inline-flex items-center px-4 py-1 rounded-full font-label font-bold text-xs tracking-widest uppercase ${
                  result?.status === 'High' ? 'bg-emerald-100 text-emerald-700' :
                  result?.status === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                  'bg-rose-100 text-rose-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-2 animate-pulse ${
                    result?.status === 'High' ? 'bg-emerald-500' :
                    result?.status === 'Moderate' ? 'bg-amber-500' :
                    'bg-rose-500'
                  }`}></span>
                  {result?.status}
                </div>
                <h2 className="font-headline text-5xl font-extrabold tracking-tight text-on-surface">{result?.decision}</h2>
                <p className="text-on-surface-variant font-body text-lg leading-relaxed max-w-md mx-auto">
                  {getDescription(result?.readiness_score || 0, result?.decision || '')}
                </p>
                {result?.reason && result.reason.length > 0 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {result.reason.map(r => (
                      <span key={r} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-100">
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Bento Grid Insights */}
            <section className="grid grid-cols-2 gap-4 mb-12">
              <div className="col-span-2 bg-surface-container-low rounded-3xl p-6 flex flex-col justify-between aspect-[2/1] relative overflow-hidden">
                <div className="z-10">
                  <span className="font-label text-[10px] font-bold tracking-[0.15em] text-blue-600 uppercase">Daily Insight</span>
                  <h3 className="font-headline text-2xl font-bold mt-2 text-on-surface max-w-[70%]">
                    {inputs.sleep >= 4 ? "Sleep quality reflects excellent recovery." : "Consistent sleep will improve your recovery curve."}
                  </h3>
                </div>
                <div className="z-10 flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-blue-600">bedtime</span>
                  <span className="text-sm font-medium">Log shows {inputs.sleep}/5 sleep quality</span>
                </div>
                <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl"></div>
              </div>

              <div className="bg-surface-container-lowest rounded-3xl p-6 flex flex-col gap-4 border border-outline-variant/10 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-orange-600">monitor_heart</span>
                </div>
                <div>
                  <div className="font-label text-[10px] font-bold tracking-widest text-secondary uppercase">Condition</div>
                  <div className="font-headline text-2xl font-bold text-on-surface">Optimal</div>
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-3xl p-6 flex flex-col gap-4 border border-outline-variant/10 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600">psychology</span>
                </div>
                <div>
                  <div className="font-label text-[10px] font-bold tracking-widest text-secondary uppercase">Stress</div>
                  <div className="font-headline text-2xl font-bold text-on-surface">
                    {inputs.stress >= 4 ? 'High' : inputs.stress >= 3 ? 'Moderate' : 'Low'}
                  </div>
                </div>
              </div>
            </section>

            {/* Actions */}
            <div className="mt-auto space-y-4">
              <button className="w-full h-14 bg-primary text-on-primary font-headline font-bold text-lg rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all">
                Start Training
                <Bolt className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setStep('input')}
                className="w-full h-14 bg-secondary-container text-on-secondary-container font-headline font-bold text-lg rounded-xl flex items-center justify-center hover:bg-secondary-fixed-dim active:scale-95 transition-all"
              >
                Back to Log
              </button>
            </div>
          </div>
        )}
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-slate-50/80 backdrop-blur-xl z-50 rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.06)] md:hidden">
        <a className="flex flex-col items-center justify-center text-slate-400 px-4 py-2 hover:text-blue-500 transition-all active:scale-90 duration-200" href="#">
          <Activity size={20} />
          <span className="font-headline text-[10px] font-bold tracking-widest uppercase mt-1">LOG</span>
        </a>
        <a className="flex flex-col items-center justify-center bg-blue-100/50 text-blue-700 rounded-xl px-4 py-2 active:scale-90 duration-200" href="#">
          <LayoutDashboard size={20} />
          <span className="font-headline text-[10px] font-bold tracking-widest uppercase mt-1">STATS</span>
        </a>
        <a className="flex flex-col items-center justify-center text-slate-400 px-4 py-2 hover:text-blue-500 transition-all active:scale-90 duration-200" href="#">
          <Calendar size={20} />
          <span className="font-headline text-[10px] font-bold tracking-widest uppercase mt-1">PLANS</span>
        </a>
        <a className="flex flex-col items-center justify-center text-slate-400 px-4 py-2 hover:text-blue-500 transition-all active:scale-90 duration-200" href="#">
          <User size={20} />
          <span className="font-headline text-[10px] font-bold tracking-widest uppercase mt-1">PROFILE</span>
        </a>
      </nav>

      {/* Injecting Styles for Material Symbols and Fonts */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@300;400;500;600;700;800;900&display=swap');
        
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-feature-settings: 'liga';
          -webkit-font-smoothing: antialiased;
        }

        input[type='range']::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          background: #003ec7;
          border-radius: 50%;
          cursor: pointer;
          border: 4px solid #ffffff;
          box-shadow: 0 4px 12px rgba(0, 62, 199, 0.2);
        }

        input[type='range']::-moz-range-thumb {
          width: 24px;
          height: 24px;
          background: #003ec7;
          border-radius: 50%;
          cursor: pointer;
          border: 4px solid #ffffff;
          box-shadow: 0 4px 12px rgba(0, 62, 199, 0.2);
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
    </div>
  )
}
