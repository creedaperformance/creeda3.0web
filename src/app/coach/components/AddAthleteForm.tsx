'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addAthleteToTeam } from '../actions'
import { Plus, Loader2, Search } from 'lucide-react'
import { Label } from '@/components/ui/label'

export function AddAthleteForm({ teamId }: { teamId: string }) {
  const [identifier, setIdentifier] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!identifier) return

    setStatus('loading')
    const result = await addAthleteToTeam(identifier, teamId)
    
    if (result.success) {
      setStatus('success')
      setMessage('Athlete added!')
      setIdentifier('')
      setTimeout(() => setStatus('idle'), 3000)
    } else {
      setStatus('error')
      setMessage(result.error || 'Failed to add')
    }
  }

  return (
    <div className="relative group">
      <form onSubmit={handleAdd} className="flex gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            id="athlete-id"
            placeholder="Search by @username..." 
            value={identifier} 
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={status === 'loading'}
            className="pl-10 pr-4 py-2 bg-muted/30 border-border rounded-xl text-xs font-bold text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-india-saffron/50 w-full md:w-64 h-12"
          />
        </div>
        <Button 
          type="submit" 
          disabled={status === 'loading'}
          className="bg-india-saffron hover:bg-india-saffron/90 text-white font-black uppercase tracking-widest text-[10px] px-6 h-12 rounded-xl shadow-lg shadow-india-saffron/20"
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" /> Add Athlete
            </>
          )}
        </Button>
      </form>
      {message && (
        <div className={`absolute top-full right-0 mt-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all animate-in fade-in slide-in-from-top-1 ${
          status === 'success' ? 'bg-india-green/5 text-india-green border-india-green/10' : 'bg-status-critical/5 text-status-critical border-status-critical/10'
        }`}>
          {message}
        </div>
      )}
    </div>
  )
}
