import { motion } from 'framer-motion';
import { Stethoscope, Sparkles, Target, MessageCircle } from 'lucide-react';
import Link from 'next/link';

interface ExpertProps {
  name: string;
  specialty: string;
  location: string;
  icon: any;
  actionText: string;
  color: string;
}

export function RecommendationFeed({ triggers }: { triggers: { showPhysio: boolean, showRecoveryExpert: boolean, showCoach: boolean } }) {
  const recommendations: ExpertProps[] = [];

  if (triggers.showPhysio) {
    recommendations.push({
      name: "Dr. Aakash Sharma",
      specialty: "Sports Physiotherapy",
      location: "Mumbai, MH",
      icon: Stethoscope,
      actionText: "WhatsApp",
      color: "text-[#10B981]"
    });
  }

  if (triggers.showRecoveryExpert) {
    recommendations.push({
      name: "Invictus Recovery",
      specialty: "Metabolic Flush & Cryo",
      location: "Delhi, NCR",
      icon: Sparkles,
      actionText: "Book Session",
      color: "text-[#FF9933]"
    });
  }

  if (triggers.showCoach) {
    recommendations.push({
      name: "Coach Vikram Singh",
      specialty: "Performance Optimization",
      location: "Bangalore, KA",
      icon: Target,
      actionText: "Message",
      color: "text-[#0A84FF]"
    });
  }

  if (recommendations.length === 0) {
    return (
      <div className="w-full space-y-3 mt-6 text-center">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 px-6 text-left">System Status:</h3>
        <div className="px-6 py-5 mx-6 rounded-3xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
          <Sparkles className="text-[#10B981] w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/90">No immediate risks — keep going strong 💪</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 mt-6">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 px-6">You may benefit from:</h3>
      
      <div className="flex overflow-x-auto pb-4 pt-2 px-6 gap-4 no-scrollbar snap-x">
        {recommendations.map((rec, i) => {
          const Icon = rec.icon;
          return (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              key={i} 
              className="flex-shrink-0 w-[240px] p-5 rounded-3xl bg-white/5 border border-white/10 snap-center shadow-max"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-black text-sm text-white tracking-tight leading-tight">{rec.name}</h4>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${rec.color}`}>{rec.specialty}</p>
                  <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">{rec.location}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-[#10B981] mt-2 flex items-center gap-1">
                    Listed on CREEDA
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center">
                  <Icon size={14} className={rec.color} />
                </div>
              </div>
              
              <Link href="#" className="flex items-center justify-center w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white font-black text-[10px] uppercase tracking-widest gap-2">
                <MessageCircle size={14} />
                {rec.actionText}
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  );
}
