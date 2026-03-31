import Link from 'next/link'
import { ArrowLeft, BookOpen, Brain, Apple, HeartPulse, Shield, Sparkles, Lock, ChevronRight } from 'lucide-react'

const MODULES = [
  {
    id: 'biomechanics',
    title: 'Biomechanics',
    titleHi: 'बायोमैकेनिक्स',
    desc: 'Understand movement science — joint angles, force production, and optimal technique',
    icon: Brain,
    color: '#FF9933',
    glow: 'rgba(255,153,51,0.15)',
    lessons: 8,
    free: true,
  },
  {
    id: 'nutrition-india',
    title: 'Indian Sports Nutrition',
    titleHi: 'भारतीय खेल पोषण',
    desc: 'Fuel your performance with Indian diet science — dal protein, timing, hydration',
    icon: Apple,
    color: '#1DB954',
    glow: 'rgba(29,185,84,0.15)',
    lessons: 12,
    free: true,
  },
  {
    id: 'recovery',
    title: 'Recovery Science',
    titleHi: 'रिकवरी विज्ञान',
    desc: 'Sleep optimization, active recovery, cold therapy, and stress management',
    icon: HeartPulse,
    color: '#0A84FF',
    glow: 'rgba(10,132,255,0.15)',
    lessons: 6,
    free: true,
  },
  {
    id: 'injury-prevention',
    title: 'Injury Prevention',
    titleHi: 'चोट निवारण',
    desc: 'Learn to identify risk factors, warm-up protocols, and rehab fundamentals',
    icon: Shield,
    color: '#EF4444',
    glow: 'rgba(239,68,68,0.15)',
    lessons: 10,
    free: false,
  },
  {
    id: 'mental-performance',
    title: 'Mental Performance',
    titleHi: 'मानसिक प्रदर्शन',
    desc: 'Focus training, pre-competition routines, pressure management & visualization',
    icon: Sparkles,
    color: '#8B5CF6',
    glow: 'rgba(139,92,246,0.15)',
    lessons: 7,
    free: false,
  },
]

export default function LearnPage() {
  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-white pt-16 pb-24 px-5">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link href="/athlete/dashboard" className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ fontStyle: 'normal' }}>
              Learn
            </h1>
            <p className="text-xs text-white/40 font-medium" style={{ fontStyle: 'normal', textTransform: 'none', letterSpacing: 'normal' }}>
              Sports science education — gamified & multilingual
            </p>
          </div>
        </div>

        {/* XP Banner */}
        <div className="mt-6 mb-8 p-4 rounded-2xl bg-gradient-to-r from-[var(--saffron)]/10 to-transparent border border-[var(--saffron)]/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white/50" style={{ fontStyle: 'normal' }}>Your Progress</span>
            <span className="text-xs font-bold text-[var(--saffron)]" style={{ fontStyle: 'normal' }}>Level 1 — 0 XP</span>
          </div>
          <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full w-0 bg-[var(--saffron)] rounded-full transition-all" />
          </div>
          <p className="text-[10px] text-white/25 mt-1.5" style={{ fontStyle: 'normal', textTransform: 'none', letterSpacing: 'normal' }}>
            Complete modules to earn XP and unlock advanced content
          </p>
        </div>

        {/* Module Cards */}
        <div className="space-y-3">
          {MODULES.map((mod) => {
            const Icon = mod.icon
            return (
              <div
                key={mod.id}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all group relative"
              >
                {/* Icon */}
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border border-white/[0.08] group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: mod.glow }}
                >
                  <Icon className="h-6 w-6" style={{ color: mod.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white truncate" style={{ fontStyle: 'normal' }}>
                      {mod.title}
                    </p>
                    {!mod.free && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-400/70 bg-amber-400/10 px-1.5 py-0.5 rounded-full shrink-0">
                        <Lock className="h-2.5 w-2.5" /> PRO
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/30 leading-relaxed line-clamp-2 mt-0.5" style={{ fontStyle: 'normal', textTransform: 'none', letterSpacing: 'normal' }}>
                    {mod.desc}
                  </p>
                  <p className="text-[10px] text-white/20 mt-1" style={{ fontStyle: 'normal' }}>
                    {mod.lessons} lessons
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-white/15 shrink-0 group-hover:text-white/30 transition-colors" />
              </div>
            )
          })}
        </div>

        {/* Coming Soon */}
        <div className="mt-8 p-6 rounded-2xl bg-white/[0.01] border border-dashed border-white/[0.06] text-center">
          <BookOpen className="h-8 w-8 text-white/10 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white/25" style={{ fontStyle: 'normal' }}>
            More modules coming soon
          </p>
          <p className="text-xs text-white/15 mt-1" style={{ fontStyle: 'normal', textTransform: 'none', letterSpacing: 'normal' }}>
            Sport psychology, periodization, strength & conditioning
          </p>
        </div>
      </div>
    </div>
  )
}
