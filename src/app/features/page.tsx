'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  ArrowRight, 
  Zap, 
  Brain, 
  ShieldAlert, 
  Activity, 
  TrendingUp, 
  LayoutDashboard,
  CheckCircle2,
  ChevronRight,
  Target,
  Clock,
  Settings,
  ShieldCheck,
  LineChart,
  HardHat,
  Users,
  Lock,
  Cpu,
  RefreshCcw,
  BarChart3
} from 'lucide-react'

export default function FeaturesPage() {
  const sections = [
    {
      title: "Athlete Intelligence",
      supporting: "CREEDA converts simple daily athlete inputs into meaningful readiness intelligence.",
      icon: Brain,
      color: "text-primary",
      bg: "bg-primary/10",
      features: [
        "Daily wellness logging (sleep, soreness, fatigue, mood, energy)",
        "Daily readiness score",
        "Sport-specific readiness interpretation",
        "Position-specific interpretation",
        "Baseline physiology calibration"
      ]
    },
    {
      title: "Training Load Intelligence",
      supporting: "Training load is interpreted against athlete physiology and sport demands.",
      icon: Zap,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      features: [
        "Session RPE logging",
        "Internal training load calculation (duration × RPE)",
        "Acute load monitoring",
        "Chronic load monitoring",
        "Load ratio detection",
        "Sport-specific load thresholds"
      ]
    },
    {
      title: "Recovery Intelligence",
      supporting: "Recovery signals are tracked before performance begins to decline.",
      icon: RefreshCcw,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      features: [
        "Sleep monitoring",
        "Fatigue trend detection",
        "Soreness interpretation",
        "Energy trend analysis",
        "Recovery alerts"
      ]
    },
    {
      title: "Performance Protection",
      supporting: "CREEDA identifies subtle changes before they become performance problems.",
      icon: ShieldCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      features: [
        "Early risk detection",
        "Overload warning system",
        "Under-recovery detection",
        "Consistency tracking",
        "Credibility layer for unrealistic input detection"
      ]
    },
    {
      title: "Athlete Testing",
      supporting: "Simple tests add objective daily performance context.",
      icon: Clock,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      features: [
        "Reaction time test",
        "Cognitive readiness input",
        "Trend memory across tests"
      ]
    },
    {
      title: "Coach Intelligence",
      supporting: "Coaches see readiness, load, and recovery across all athletes in one system.",
      icon: LayoutDashboard,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      features: [
        "Coach dashboard",
        "Multi-athlete monitoring",
        "Team trend view",
        "Athlete prioritisation alerts",
        "Individual athlete profiles"
      ]
    },
    {
      title: "Smart Platform Features",
      supporting: "Built for smooth athlete onboarding and scalable coach control.",
      icon: Settings,
      color: "text-white",
      bg: "bg-white/10",
      features: [
        "Coach code athlete linking",
        "Unrestricted performance intelligence",
        "Unified athlete-coach collaboration",
        "Smart athlete-coach permissions"
      ]
    },
    {
      title: "Intelligence Engine",
      supporting: "CREEDA interprets trends, not isolated entries.",
      icon: Cpu,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
      features: [
        "7-day trend interpretation",
        "28-day adaptation tracking",
        "Dynamic readiness recalculation",
        "Human physiology-based scoring"
      ]
    }
  ]

  return (
    <div className="flex min-h-screen flex-col bg-[#080C14] selection:bg-primary/30 selection:text-white">
      {/* Navigation Header */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#080C14]/80 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
             <img src="/logo.png" alt="Creeda Logo" className="h-8 w-auto group-hover:scale-110 transition-transform duration-500" />
             <span className="text-white font-black uppercase tracking-widest text-sm hidden sm:block" style={{ fontFamily: 'var(--font-orbitron)' }}>CREEDA</span>
          </Link>
          <div className="flex items-center gap-6">
            
            <Button asChild size="sm" className="rounded-full bg-white text-black font-black uppercase tracking-widest text-[9px] h-9 px-6 hover:bg-white/90">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-32 pb-24">
        {/* Hero Section */}
        <section className="container mx-auto max-w-5xl px-4 mb-24 text-center">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black text-primary mb-8 uppercase tracking-[0.3em] animate-fade-up">
            Performance Infrastructure
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter uppercase leading-[0.9]" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Powering the <br /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-india-green">Modern Athlete</span>
          </h1>
          <div className="max-w-3xl mx-auto space-y-4">
            <p className="text-xl md:text-2xl text-white font-bold leading-tight">
              Sports science made practical for everyday athletes
            </p>
            <p className="text-lg text-white/60 font-medium">
              Understand readiness, manage load, monitor trends, recover better.
            </p>
            <p className="max-w-2xl mx-auto text-base text-white/30 font-medium leading-relaxed">
              CREEDA turns your daily inputs into sports science intelligence for better body awareness, smarter load management, and timely recovery.
            </p>
          </div>
        </section>

        {/* Dynamic Feature Grid */}
        <section className="container mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {sections.map((section, idx) => (
              <div 
                key={idx}
                className="group relative rounded-[3rem] border border-white/5 bg-gradient-to-br from-[#121826]/40 to-transparent p-10 transition-all hover:border-primary/20 hover:bg-white/[0.02]"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className={`h-16 w-16 rounded-2xl ${section.bg} ${section.color} flex items-center justify-center transition-transform group-hover:scale-110 duration-500`}>
                    <section.icon size={32} />
                  </div>
                  <div className="text-right">
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${section.color} mb-1 opacity-60`}>Modular Intelligence</p>
                    <div className="h-0.5 w-12 ml-auto bg-gradient-to-r from-transparent to-current opacity-20" />
                  </div>
                </div>

                <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tight" style={{ fontFamily: 'var(--font-orbitron)' }}>
                  {section.title}
                </h2>
                <p className="text-white/40 text-sm font-bold uppercase tracking-widest mb-10 min-h-[2.5rem] leading-snug">
                  {section.supporting}
                </p>

                <div className="space-y-4">
                  {section.features.map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-4 group/item">
                       <div className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-primary/40 group-hover/item:bg-primary group-hover/item:scale-150 transition-all" />
                       <span className="text-white/60 text-sm font-medium group-hover/item:text-white transition-colors">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Decorative background element */}
                <div className={`absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity`}>
                   <section.icon size={120} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="container mx-auto max-w-4xl px-4 mt-32 text-center">
           <div className="p-16 rounded-[4rem] border border-white/5 bg-gradient-to-b from-[#121826]/40 to-transparent relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
              <div className="relative z-10">
                <h2 className="text-4xl font-black text-white mb-6 uppercase tracking-tight" style={{ fontFamily: 'var(--font-orbitron)' }}>Ready to level up?</h2>
                <p className="text-white/40 mb-10 max-w-xl mx-auto">
                  Join the network of elite athletes and coaches using data to drive performance excellence.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button asChild size="lg" className="h-16 px-12 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs hover:bg-primary/90 shadow-2xl shadow-primary/20">
                    <Link href="/signup">Get Started Now</Link>
                  </Button>
                  
                </div>
              </div>
           </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-12 text-center">
         <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.4em]">CREEDA &copy; 2026 — Powering Performance</p>
      </footer>
    </div>
  )
}
