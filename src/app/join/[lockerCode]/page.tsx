import { getInviteData } from '@/lib/actions/connection'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ShieldCheck, Trophy, ArrowRight, Star } from 'lucide-react'

export default async function JoinPage({
  params,
}: {
  params: Promise<{ lockerCode: string }> | { lockerCode: string }
}) {
  const { lockerCode } = await params
  const invite = await getInviteData(lockerCode)

  if (invite.error) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <ShieldCheck className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Invite Expired
          </h1>
          <p className="text-muted-foreground font-medium">{invite.error}</p>
          <Button asChild className="w-full h-14 rounded-2xl bg-card text-background hover:bg-border font-black uppercase tracking-widest">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-card relative overflow-hidden flex flex-col items-center justify-center px-4 py-20">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-emerald-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-2xl w-full relative z-10 space-y-12 text-center">
        {/* Branding */}
        <div className="space-y-4">
          <h2 className="text-blue-500 font-black uppercase tracking-[0.3em] text-[10px]" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Creeda Precision Intelligence
          </h2>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/5 border border-white/10 backdrop-blur-sm">
            <Trophy size={14} className="text-amber-400" />
            <span className="text-[10px] font-black uppercase text-white tracking-widest">Official Squad Invite</span>
          </div>
        </div>

        {/* Impact Message */}
        <div className="space-y-6">
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none" style={{ fontFamily: 'var(--font-orbitron)' }}>
            Join <span className="text-blue-500">{invite.teamName}</span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-lg mx-auto leading-relaxed">
            You&apos;ve been invited by <span className="text-white font-bold">Coach {invite.coachName}</span> to join their elite digital squad.
          </p>
        </div>

        {/* Benefits Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          <div className="p-6 rounded-3xl bg-card/5 border border-white/10 backdrop-blur-md space-y-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Star className="text-blue-500" size={20} />
            </div>
            <h3 className="text-white font-black uppercase text-xs tracking-widest">Precision Tracking</h3>
            <p className="text-muted-foreground text-[11px] leading-relaxed">Access position-specific drills and AI readiness insights curated for {invite.sport}.</p>
          </div>
          
          <div className="p-6 rounded-3xl bg-card/5 border border-white/10 backdrop-blur-md space-y-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 bg-emerald-500 px-3 py-1 rounded-bl-xl text-[8px] font-black uppercase text-white animate-pulse">
              Full Access Enabled
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <ShieldCheck className="text-amber-500" size={20} />
            </div>
            <h3 className="text-white font-black uppercase text-xs tracking-widest">Direct Coach Access</h3>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Join the roster, connect with your coach, and unlock the full CREEDA experience from day one.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-8 pt-6">
          <Button asChild className="w-full md:w-80 h-16 rounded-2xl bg-card text-background hover:bg-border font-black uppercase tracking-widest text-sm shadow-2xl shadow-white/10 group">
            <Link href={`/signup?role=athlete&coach=${lockerCode}`}>
              Join Squad
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>

          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
            Don&apos;t have an account? Create one in <span className="text-muted-foreground">less than 2 minutes</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
