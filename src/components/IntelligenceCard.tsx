'use client'

import { ReactNode } from 'react'

interface IntelligenceCardProps {
  children: ReactNode;
  label: string;
  statusColor?: string;
  className?: string;
  onClick?: () => void;
  why?: string;
  action?: string;

}

export function IntelligenceCard({ children, label, statusColor, className = "", onClick, why, action }: IntelligenceCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`relative p-6 bg-card border border-border rounded-[1.5rem] shadow-sm group transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-primary/50 hover:shadow-md active:scale-[0.99]' : ''} ${className}`}
    >
      {/* Professional Status Accent (Optional) */}
      {statusColor && (
        <div className="absolute left-0 top-6 bottom-6 w-[4px] rounded-r-full" style={{ backgroundColor: statusColor }} />
      )}
      
      {/* Header Label */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-india-saffron transition-colors">
          {label}
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 text-foreground mb-4">
        {children}
      </div>

      {/* Explainability Layer */}
      <div className="pt-4 mt-4 border-t border-border/50 space-y-3 relative z-10">
        <>
          {why && (
            <div className="mb-4">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Observation</p>
              <p className="text-sm font-bold text-foreground leading-snug italic">"{why}"</p>
            </div>
          )}
          {action && (
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Action Directive</p>
              <p className="text-sm font-bold text-foreground leading-snug">{action}</p>
            </div>
          )}
          {(!why && !action) && children}
        </>
      </div>

      {/* Hover Background Subtle Effect */}
      <div className={`absolute inset-0 rounded-[1.5rem] bg-india-saffron/0 ${onClick ? 'group-hover:bg-india-saffron/10' : ''} transition-colors pointer-events-none`} />
    </div>
  )
}
