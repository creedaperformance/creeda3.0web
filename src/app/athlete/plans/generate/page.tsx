'use client'

import Link from 'next/link'
import { ArrowLeft, Sparkles, AlertCircle, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n/LanguageProvider'

export default function GeneratePlanPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-white pt-16 pb-24 px-5 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--saffron)]/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-md mx-auto relative z-10">
        <div className="flex items-center gap-3 mb-12">
          <Link href="/athlete/plans" className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
             <Sparkles className="h-3.5 w-3.5 text-[var(--saffron)]" />
             <span className="text-[10px] font-bold tracking-widest uppercase">Creeda Pro</span>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[var(--saffron)]/20 to-transparent rounded-3xl border border-[var(--saffron)]/30 flex items-center justify-center shadow-2xl shadow-[var(--saffron)]/20">
             <Dumbbell className="h-10 w-10 text-[var(--saffron)]" />
          </div>

          <div>
             <h1 className="text-3xl font-black mb-3 text-white tracking-tight leading-tight">
               Smart Training Plans
               <br />
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--saffron)] to-amber-300">
                  Coming in Phase 3
               </span>
             </h1>
             <p className="text-sm text-slate-400 font-medium px-4 leading-relaxed">
               Our V4 Intelligence Engine is currently processing integration pipelines for Stripe, Strava, and Google Fit. 
               Personalized generation will unlock shortly.
             </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left space-y-4">
             <div className="flex gap-3">
               <AlertCircle className="h-5 w-5 text-blue-400 shrink-0" />
               <p className="text-xs text-slate-300 leading-relaxed">
                 <strong className="text-white block mb-1">Upcoming Features:</strong>
                 • 4-Week Periodized Microcycles<br />
                 • Localized Indian Nutrition Tracking<br />
                 • Automated Wearable Synchronization
               </p>
             </div>
          </div>

          <Button 
            asChild
            className="w-full h-14 bg-white text-black hover:bg-slate-200 font-bold tracking-wide rounded-2xl mt-4"
          >
             <Link href="/athlete/plans">
               Return to Plans
             </Link>
          </Button>

        </motion.div>
      </div>
    </div>
  )
}
