'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { joinTeamWithCode } from '@/app/coach/actions'
import { ShieldCheck, Loader2, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'

export function JoinTeam({ onJoinSuccess }: { onJoinSuccess?: () => void }) {
  const [inviteCode, setInviteCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inviteCode.length < 4) return

    setIsSubmitting(true)
    try {
      const result = await joinTeamWithCode(inviteCode)
      if (result.success) {
        toast.success(result.message)
        setInviteCode('')
        if (onJoinSuccess) onJoinSuccess()
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-border bg-card/30 backdrop-blur-sm overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-primary" />
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-accent" />
          Tactical Connection
        </CardTitle>
        <CardDescription className="text-xs">
          Connect with your coach to enable squad-level intelligence.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-white/20 font-bold text-xs uppercase tracking-widest">Code</span>
            <Input 
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="E.G. XJ48K2"
              className="bg-black/20 border-white/5 pl-14 text-sm font-black tracking-widest placeholder:text-white/10 h-10"
              maxLength={12}
              disabled={isSubmitting}
            />
          </div>
          <Button 
            type="submit" 
            disabled={isSubmitting || inviteCode.length < 4}
            className="w-full bg-accent hover:bg-accent/90 text-white font-bold text-xs h-10 group"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                INITIATE COMMAND LINK
                <ShieldCheck className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
