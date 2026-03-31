'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Settings, X, Loader2, LogOut, Eye, EyeOff } from 'lucide-react'
import { updateProfile, deleteAccount } from '@/app/athlete/actions'
import { toast } from 'sonner'
import { AvatarUpload } from '@/components/AvatarUpload'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function CoachTopBar({ user }: { user: any }) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    username: user.username || '',
    avatar_url: user.avatar_url || '',
    mobile_number: user.mobile_number || '',
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const handleUpdate = async () => {
    if (newPassword) {
      if (newPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return }
      if (newPassword !== confirmPassword) { toast.error('Passwords do not match.'); return }
    }
    setIsUpdating(true)
    const res = await updateProfile(formData)
    if (newPassword && res.success !== false) {
      const supabase = createClient()
      const { error: pwError } = await supabase.auth.updateUser({ password: newPassword })
      if (pwError) {
        toast.error('Profile saved, but password update failed: ' + pwError.message)
        setIsUpdating(false)
        return
      }
    }
    if (res.success) {
      toast.success('Profile updated!')
      setShowEditModal(false)
      setNewPassword('')
      setConfirmPassword('')
      window.location.reload()
    } else {
      toast.error(res.error || 'Failed to update')
    }
    setIsUpdating(false)
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    const res = await deleteAccount()
    if (res.success) {
      toast.success('Account deleted successfully.')
      router.push('/')
      router.refresh()
    } else {
      toast.error(res.error || 'Failed to delete account.')
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 px-5 pt-safe-top pb-3 pt-4 flex items-center justify-between bg-[#111827]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3 shrink-0">
          <img src="/logo.png" alt="Creeda Flame Logo" className="h-8 w-auto object-contain shrink-0" />
          <img src="/creeda-performance-logo.png" alt="Creeda Performance Text Logo" className="h-5 w-auto object-contain shrink-0 brightness-0 invert" style={{ filter: 'brightness(0) invert(1)' }} />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowEditModal(true)}
            className="h-8 w-8 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-card/5 transition-all"
          >
            <Settings className="h-4 w-4" />
          </button>
          <form action="/auth/signout" method="post">
            <button type="submit" className="h-8 w-8 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-card/5 transition-all">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Edit Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md overflow-y-auto w-full h-full animate-in fade-in duration-300"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false) }}
        >
          <div 
            className="flex min-h-full w-full items-center justify-center py-10 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false) }}
          >
            <div className="relative w-full max-w-lg bg-[#0D1520] border border-white/10 rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
              
              {/* ── Header ── */}
              <div className="shrink-0 relative px-8 pt-8 pb-4">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent rounded-t-3xl pointer-events-none" />
                
                <button 
                  onClick={() => setShowEditModal(false)} 
                  className="absolute top-6 right-6 z-10 text-white/30 hover:text-white bg-black/50 backdrop-blur-md rounded-full p-2 transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
                
                <div className="text-center">
                  <h2 className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: 'var(--font-orbitron)' }}>Coach Settings</h2>
                  <p className="text-white/40 text-sm font-medium mb-6">Update your admin profile</p>
                  
                  <div className="flex justify-center mb-2">
                    {userId && (
                      <AvatarUpload 
                        uid={userId}
                        currentUrl={formData.avatar_url}
                        onUploadComplete={(url) => setFormData({ ...formData, avatar_url: url })}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* ── Form Body ── */}
              <div className="flex-1 px-8 pb-8 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Full Name</label>
                  <Input 
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Enter your name"
                    className="bg-card/5 border-white/10 text-white h-12 rounded-xl focus:border-primary placeholder:text-white/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Username</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-white/30 font-bold text-sm">@</span>
                    <Input 
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      placeholder="username"
                      className="bg-card/5 border-white/10 text-white h-12 pl-9 rounded-xl focus:border-primary placeholder:text-white/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Mobile Number</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-white/30 font-bold text-sm">+</span>
                    <Input
                      value={formData.mobile_number}
                      onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                      placeholder="91XXXXXXXXXX"
                      className="bg-card/5 border-white/10 text-white h-12 pl-8 rounded-xl focus:border-primary placeholder:text-white/20"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-card/[0.03] border border-white/5 px-4 py-3 flex items-start gap-3">
                  <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest shrink-0 mt-0.5">Email</span>
                  <p className="text-[10px] text-white/30 leading-relaxed">To change your email, contact <span className="text-primary font-bold">creedaperformance@gmail.com</span>.</p>
                </div>

                <div className="border-t border-white/10 pt-6 mt-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4 ml-1">Change Password</p>
                  <div className="space-y-4">
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (min 8 chars)"
                        className="bg-card/5 border-white/10 text-white h-12 pr-10 rounded-xl focus:border-primary placeholder:text-white/20"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-white/30 hover:text-white transition-colors">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="bg-card/5 border-white/10 text-white h-12 rounded-xl focus:border-primary placeholder:text-white/20"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black text-lg rounded-xl shadow-lg shadow-primary/20 mt-6 shrink-0 transition-all active:scale-95"
                >
                  {isUpdating ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Save Changes'}
                </Button>

                <div className="pt-8 mt-2 border-t border-white/5">
                  {!showDeleteConfirm ? (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-[10px] font-black uppercase tracking-widest text-red-500/40 hover:text-red-500 transition-colors mx-auto block"
                    >
                      Delete Account
                    </button>
                  ) : (
                    <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 animate-in zoom-in-95 duration-200">
                      <p className="text-xs font-bold text-red-500 text-center mb-3 text-pretty">Are you absolutely sure? All squad data will be permanently erased.</p>
                      <div className="flex gap-2">
                        <Button 
                          variant="destructive"
                          onClick={handleDeleteAccount}
                          disabled={isDeleting}
                          className="flex-1 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest bg-red-600 hover:bg-red-700"
                        >
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Delete'}
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={isDeleting}
                          className="flex-1 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest bg-card/5 border-white/10 text-white hover:bg-card/10"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
