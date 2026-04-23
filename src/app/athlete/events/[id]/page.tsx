'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Calendar, Clock, Ticket, Target, ShieldAlert, Zap } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

type PlatformEvent = {
  event_name: string
  event_type: string
  skill_level: string
  location: string
  event_date: string
  description?: string | null
  registration_link?: string | null
}

export default function EventDetail() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [event, setEvent] = useState<PlatformEvent | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchEvent() {
      const supabase = createClient()
      const { data } = await supabase
        .from('platform_events')
        .select('*')
        .eq('id', params.id)
        .single()

      if (data) setEvent(data)
      setIsLoading(false)
    }
    fetchEvent()
  }, [params.id])

  if (isLoading) {
    return <div className="min-h-screen bg-[#04070A] flex justify-center pt-32"><div className="w-8 h-8 rounded-full border-t-2 border-[#0A84FF] animate-spin" /></div>
  }

  if (!event) {
    router.push('/athlete/events')
    return null
  }

  // Helper date logic
  const eventDate = new Date(event.event_date)
  const diffTime = Math.abs(eventDate.getTime() - new Date().getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const weeksLeft = Math.max(1, Math.round(diffDays / 7))

  // Dynamically generate intelligent prep guidelines based on event type
  let prepPlan = {
    focus: 'General Aerobic Base',
    risk: 'Calf & Achilles over-tension',
    description: 'Build your aerobic capacity gradually. Avoid massive weekly mileage spikes.'
  }

  if (event.event_type.includes('Functional') || event.event_type.includes('CrossFit')) {
    prepPlan = { focus: 'Threshold & Lactic Tolerance', risk: 'Shoulder Impingement / Lower Back Fatigue', description: 'Prioritize intense interval work mixed with heavy compound lifts. Mobility is mandatory.' }
  } else if (event.event_type.includes('Grappling') || event.event_type.includes('Boxing')) {
    prepPlan = { focus: 'Anaerobic Output & Grip Endurance', risk: 'Joint sprains / Concussion protocols', description: 'Simulate round timings. Increase neck strength and rotational core stability.' }
  } else if (event.event_type.includes('Cycling') || event.event_type.includes('Endurance') || event.event_type.includes('Triathlon')) {
    prepPlan = { focus: 'Zone 2 Volume & Leg Power', risk: 'Knee tracking / IT Band Friction', description: 'Accumulate time in saddle. Integrate heavy isolated leg extensions to armor the knees.' }
  }

  const handleStartPrep = () => {
     // Inject event prep into daily UI interpretation via local storage
     localStorage.setItem('creeda_event_prep', JSON.stringify({ 
       eventName: event.event_name, 
       focus: prepPlan.focus,
       date: event.event_date 
     }))

     toast.success(`Training metrics recalibrated for ${event.event_name}!`)
     
     // Route back to dashboard and refresh state
     setTimeout(() => {
       router.push('/athlete')
     }, 1500)
  }

  return (
    <div className="min-h-screen bg-[#04070A] text-white font-sans pb-32 relative">
      {/* Immersive Header */}
      <div className="relative h-72 bg-gradient-to-b from-[#0A84FF]/20 to-[#04070A] flex items-end pb-8 px-6">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#0A84FF]/10 blur-[150px] rounded-full pointer-events-none" />
        <Link href="/athlete/events" className="absolute top-12 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white/10 transition z-20">
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </Link>
        <div className="relative z-10 w-full max-w-lg mx-auto">
          <div className="flex flex-wrap gap-2 mb-3">
             <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#0A84FF] text-white text-[8px] font-black tracking-widest uppercase">
               {event.event_type}
             </span>
             <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-[8px] font-bold tracking-widest uppercase border border-white/20">
               {event.skill_level}
             </span>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white leading-tight mb-2">{event.event_name}</h1>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/50">
             <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-white/30" /> {event.location}</span>
             <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-white/30" /> {eventDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 space-y-8 mt-4 relative z-10">
        
        {/* Description Snippet */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10">
           <p className="text-sm font-bold text-white/70 leading-relaxed">{event.description || 'Join athletes from around the region for this premier competitive event.'}</p>
        </div>

        {/* Action Bridge: Prepare for this Event */}
        <div>
          <div className="flex items-center gap-2 mb-4">
             <div className="w-6 h-6 rounded-full bg-[#10B981]/20 flex items-center justify-center">
                <Target className="w-3 h-3 text-[#10B981]" />
             </div>
             <h2 className="text-lg font-black uppercase tracking-tighter text-white">Prepare For This Event</h2>
          </div>
          
          <div className="bg-[#10B981]/5 border border-[#10B981]/20 rounded-3xl p-6 relative overflow-hidden">
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#10B981]/10 rounded-full blur-[30px]" />
             
             {/* Timeline */}
             <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#10B981]/10">
                <div className="p-3 bg-[#10B981]/10 rounded-2xl border border-[#10B981]/20">
                   <Clock className="w-6 h-6 text-[#10B981]" />
                </div>
                <div>
                   <p className="text-[9px] font-black uppercase tracking-widest text-[#10B981] mb-0.5">Timeline Countdown</p>
                   <p className="text-xl font-black uppercase tracking-tighter text-white">{weeksLeft} Weeks Open</p>
                </div>
             </div>

             {/* Dynamic Preparation Guidance */}
             <div className="space-y-4">
                <div>
                   <p className="text-[9px] font-black uppercase tracking-widest text-[#10B981]/70 mb-1 flex items-center gap-1"><Zap className="w-3 h-3"/> Suggested Focus</p>
                   <p className="text-sm font-bold text-white leading-relaxed">{prepPlan.focus}</p>
                   <p className="text-[11px] font-bold text-white/50 mt-1">{prepPlan.description}</p>
                </div>
                
                <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                   <p className="text-[9px] font-black uppercase tracking-widest text-[#FF9933] mb-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> Primary Injury Risk</p>
                   <p className="text-xs font-bold text-white/80">{prepPlan.risk}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Global Action Fixed Bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#04070A] via-[#04070A] to-transparent z-40">
           <div className="max-w-lg mx-auto grid grid-cols-2 gap-3">
              <button 
                onClick={handleStartPrep}
                className="w-full flex justify-center items-center py-4 rounded-2xl bg-white text-black hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all text-[11px] font-black uppercase tracking-widest"
              >
                Start Prep
              </button>
              {event.registration_link && (
                <Link 
                  href={event.registration_link}
                  target="_blank"
                  className="w-full flex justify-center items-center gap-2 py-4 rounded-2xl bg-[#0A84FF] hover:bg-[#0A84FF]/90 shadow-[0_0_30px_rgba(10,132,255,0.2)] transition-all text-white text-[11px] font-black uppercase tracking-widest"
                >
                  <Ticket className="w-4 h-4" /> Register
                </Link>
              )}
           </div>
        </div>

      </div>
    </div>
  )
}
