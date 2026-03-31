'use client'

import { PlusCircle, User } from 'lucide-react'
import { AddAthleteForm } from './AddAthleteForm'

export function CoachProfileHeader({ user, teamId, teamName, inviteCode }: { user: any, teamId?: string, teamName?: string, inviteCode?: string }) {
  return (
    <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-2">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="h-[60px] w-[60px] rounded-full p-[2px] bg-gradient-to-tr from-primary to-accent shadow-lg shadow-primary/20">
            <div className="h-full w-full rounded-full bg-[#1A2742] overflow-hidden flex items-center justify-center">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User className="h-6 w-6 text-white/40" />
              )}
            </div>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-india-green border-2 border-[#111827] flex items-center justify-center">
            <span className="text-[6px] text-white font-black">✓</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-white leading-none truncate">{user.full_name || 'Coach Portal'}</h2>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-bold text-primary/80">@{user.username || user.email}</span>
            <span className="text-white/20 text-xs">•</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Master Admin</span>
          </div>
        </div>
      </div>
      
      {teamId && (
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {inviteCode && (
            <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4 min-w-[200px] flex flex-col justify-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-accent mb-1 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                Team Invite Link
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xl font-black text-white tracking-widest">{inviteCode}</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(inviteCode)
                    alert("Invite code copied to clipboard!")
                  }}
                  className="px-2 py-1 rounded bg-card/5 hover:bg-card/10 text-[10px] font-bold text-white/40 border border-white/10"
                >
                  COPY
                </button>
              </div>
            </div>
          )}

          <div className="bg-card/5 border border-white/10 rounded-2xl p-4 min-w-[280px]">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary mb-3">
              <PlusCircle className="h-3 w-3" /> Manual Force-Add
            </div>
            <AddAthleteForm teamId={teamId} />
          </div>
        </div>
      )}
    </section>
  )
}
