'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Calendar, ArrowLeft, Ticket, Navigation2, Flame } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const EVENT_FILTERS = ["All Events", "Running", "Functional Fitness", "Combat", "Cycling", "Endurance"]

export default function EventsDiscovery() {
  const router = useRouter()
  
  const [activeFilter, setActiveFilter] = useState("All Events")
  const [events, setEvents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true)
      const supabase = createClient()
      
      const { data } = await supabase
        .from('platform_events')
        .select('*')
        .order('event_date', { ascending: true })

      if (data) setEvents(data)
      setIsLoading(false)
    }
    fetchEvents()
  }, [])

  const filteredEvents = events.filter(e => {
    if (activeFilter === 'All Events') return true;
    if (activeFilter === 'Combat') return e.event_type === 'Grappling' || e.event_type === 'Boxing';
    if (activeFilter === 'Endurance') return e.event_type === 'Triathlon' || e.event_type === 'Open Water Swimming' || e.event_type === 'Mountaineering';
    return e.event_type.toLowerCase().includes(activeFilter.toLowerCase());
  })

  // Format date helper
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }
  const getDaysLeft = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime()
    return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)))
  }

  return (
    <div className="min-h-screen bg-[#04070A] text-white flex flex-col font-sans pb-32 relative">
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#0A84FF]/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#04070A]/90 backdrop-blur-xl border-b border-white/5 pt-12 pb-4 px-6">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => router.push('/athlete')} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition">
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-black uppercase tracking-tighter">Event Radar</h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#0A84FF]">Find Your Next Challenge</p>
          </div>
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
            <Search className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
          {EVENT_FILTERS.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === cat ? 'bg-[#0A84FF] text-white shadow-[0_0_20px_rgba(10,132,255,0.3)]' : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-lg mx-auto p-6 space-y-6">
        
        {isLoading ? (
          <div className="space-y-6">
            {[1,2,3].map(i => <div key={i} className="w-full h-48 bg-white/5 rounded-3xl animate-pulse" />)}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 px-6 border border-white/10 rounded-3xl border-dashed">
            <Navigation2 className="w-8 h-8 text-white/20 mx-auto mb-4" />
            <p className="text-xs font-black uppercase tracking-widest text-white/40">No events found</p>
            <p className="text-[10px] font-bold text-white/30 mt-2">Check back later or expand your filters.</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredEvents.map((event, i) => (
              <motion.div 
                key={event.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => router.push(`/athlete/events/${event.id}`)}
                className="group relative bg-[#04070A] border border-white/10 rounded-3xl overflow-hidden hover:border-[#0A84FF]/50 transition-colors cursor-pointer shadow-2xl"
              >
                {/* Event Hero Area Mock */}
                <div className="h-32 bg-white/5 relative overflow-hidden flex items-center justify-center">
                   <div className="absolute inset-0 bg-gradient-to-t from-[#04070A] to-transparent z-10" />
                   <h2 className="text-4xl font-black uppercase tracking-tighter text-white/5 absolute z-0 select-none hidden md:block">{event.event_type}</h2>
                   
                   {/* Date Badge */}
                   <div className="absolute top-4 left-4 z-20 bg-[#0A84FF] text-white rounded-xl p-2 text-center shadow-[0_0_20px_rgba(10,132,255,0.4)]">
                     <p className="text-[8px] font-black uppercase tracking-widest opacity-80 mb-0.5">Start</p>
                     <p className="text-sm font-black uppercase tracking-tighter leading-none">{formatDate(event.event_date)}</p>
                   </div>
                   
                   {/* Days Left Badge */}
                   <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-black/50 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10">
                     <Flame className="w-3 h-3 text-[#FF9933]" />
                     <p className="text-[9px] font-black uppercase tracking-widest text-white">{getDaysLeft(event.event_date)} days left</p>
                   </div>
                </div>

                <div className="p-6 pt-0 relative z-20">
                  <h3 className="text-lg font-black uppercase tracking-tighter text-white mb-2 leading-tight group-hover:text-[#0A84FF] transition-colors">{event.event_name}</h3>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-[8px] font-bold tracking-widest uppercase">
                      <MapPin className="w-3 h-3 text-white/40" /> {event.location}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#0A84FF] text-[8px] font-black tracking-widest uppercase">
                      {event.skill_level}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <button className="w-full flex justify-center items-center py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white text-[10px] font-black uppercase tracking-widest">
                      View Details
                    </button>
                    {event.registration_link && (
                      <Link 
                        href={event.registration_link}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full flex justify-center items-center gap-2 py-3 rounded-xl bg-[#0A84FF] hover:bg-[#0A84FF]/80 shadow-[0_0_30px_rgba(10,132,255,0.2)] transition-all text-white text-[10px] font-black uppercase tracking-widest"
                      >
                        <Ticket className="w-4 h-4" /> Register
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
