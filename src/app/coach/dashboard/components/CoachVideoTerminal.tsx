"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Video, Scan, AlertCircle, ChevronRight, Activity, Cpu } from "lucide-react";
import type { VideoAnalysisRecommendation, VideoAnalysisReportSummary } from "@/lib/video-analysis/reporting";

interface Props {
  reports: Array<VideoAnalysisReportSummary & { athleteName: string; athleteAvatarUrl: string | null }>
}

function buildInsightRows(report: VideoAnalysisReportSummary) {
  if (report.visionFaults.length > 0) {
    return report.visionFaults.map((fault) => ({
      title: fault.fault,
      meta: `Severity: ${fault.severity.toUpperCase()} • ${fault.riskMapping || 'Movement is drifting from the target standard.'}`,
    }))
  }

  return report.recommendations.map((recommendation) => ({
    title: recommendation.title,
    meta: buildRecommendationMeta(recommendation),
  }))
}

function buildRecommendationMeta(recommendation: VideoAnalysisRecommendation) {
  return `Priority: ${recommendation.priority.toUpperCase()} • ${recommendation.reason || 'Use this action point as the next correction focus.'}`
}

export const CoachVideoTerminal: React.FC<Props> = ({ reports }) => {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(reports[0]?.id || null);

  const selectedReport = useMemo(() => 
    reports.find((report) => report.id === selectedReportId), 
    [reports, selectedReportId]
  );

  if (reports.length === 0) {
    return (
      <div className="p-8 rounded-[2rem] bg-slate-900/30 border border-slate-800/50 border-dashed text-center">
         <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-6">
            <Video className="h-6 w-6 text-slate-700" />
         </div>
         <h4 className="text-sm font-black italic uppercase tracking-widest text-slate-400 font-orbitron">No Technical Analysis Pending</h4>
         <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-2 max-w-[200px] mx-auto">
            Vision fault data will appear here once athletes upload training footage.
         </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* 1. ATHLETE FEED */}
      <div className="lg:col-span-2 space-y-4">
         <div className="flex items-center gap-3 mb-2 px-2">
            <Cpu className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vision Trace Pipeline</span>
         </div>
         <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {reports.map((report) => (
               <button
                  key={report.id}
                  onClick={() => setSelectedReportId(report.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${selectedReportId === report.id ? 'bg-primary border-primary' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
               >
                  <div className="flex items-center gap-4">
                     <div
                        className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden ring-2 ring-slate-900 bg-cover bg-center"
                        style={report.athleteAvatarUrl ? { backgroundImage: `url(${report.athleteAvatarUrl})` } : undefined}
                     >
                        {report.athleteAvatarUrl ? (
                           <span className="sr-only">{report.athleteName}</span>
                        ) : (
                           <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px] uppercase font-bold">
                              {report.athleteName.charAt(0)}
                           </div>
                        )}
                     </div>
                     <div>
                        <h4 className={`text-xs font-black italic uppercase font-orbitron ${selectedReportId === report.id ? 'text-slate-950' : 'text-white'}`}>
                           {report.athleteName}
                        </h4>
                        <span className={`text-[8px] font-bold uppercase tracking-widest ${selectedReportId === report.id ? 'text-slate-900' : 'text-slate-500'}`}>
                           {report.sportLabel} • {report.summary.score}% scan
                        </span>
                     </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 ${selectedReportId === report.id ? 'text-slate-950' : 'text-slate-700'}`} />
               </button>
            ))}
         </div>
      </div>

      {/* 2. FAULT ANALYSIS TERMINAL */}
      <div className="lg:col-span-3 min-h-[500px] rounded-3xl bg-slate-950 border border-slate-800 p-8 flex flex-col relative overflow-hidden">
         <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
            <div className="h-full w-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:40px_40px]" />
         </div>
         
         <AnimatePresence mode="wait">
            {selectedReport ? (
               <motion.div
                  key={selectedReport.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="relative z-10 flex flex-col h-full"
               >
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                     <div className="flex items-center gap-4">
                        <Scan className="h-5 w-5 text-primary" />
                        <div>
                           <h3 className="text-lg font-black italic uppercase tracking-tight text-white font-orbitron">Biomechanical Audit</h3>
                           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{selectedReport.athleteName} • {selectedReport.sportLabel}</p>
                        </div>
                     </div>
                     <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary uppercase tracking-widest">
                        {selectedReport.summary.status}
                     </div>
                  </div>

                  <div className="flex-1 space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                           <Activity className="h-4 w-4 text-emerald-500 mb-2" />
                           <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Movement Score</span>
                           <span className="text-xl font-black italic text-emerald-500 font-orbitron">{selectedReport.summary.score}%</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                           <AlertCircle className="h-4 w-4 text-amber-500 mb-2" />
                           <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Corrections</span>
                           <span className="text-xl font-black italic text-amber-500 font-orbitron">{selectedReport.warnings}</span>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Detected Technical Deviations</span>
                        <div className="space-y-3">
                           {buildInsightRows(selectedReport).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                                 <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                 <div>
                                    <span className="text-[11px] font-black italic uppercase text-white font-orbitron block">{item.title || "Biomechanical Anomaly"}</span>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                       {item.meta}
                                    </p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                     <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">V5 Analysis Engine • v2026.03.30</span>
                     <Link href={`/coach/reports/${selectedReport.id}`} className="px-6 py-3 rounded-xl bg-white text-slate-950 font-black uppercase text-[10px] italic hover:bg-primary transition-all">
                        Open Full Report
                     </Link>
                  </div>
               </motion.div>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                  <div className="w-20 h-20 rounded-full border border-slate-800 flex items-center justify-center mb-6">
                     <Video className="h-8 w-8 text-slate-700" />
                  </div>
                  <h4 className="text-sm font-black italic uppercase tracking-[0.2em] text-slate-400 font-orbitron">No Target Selected</h4>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2">Choose an athlete to engage technical audit.</p>
               </div>
            )}
         </AnimatePresence>
      </div>
    </div>
  );
};
