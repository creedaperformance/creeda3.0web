'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, ShieldAlert, Eye, EyeOff, User, MessageSquare } from 'lucide-react'
import { updateProfile, deleteAccount } from '../actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { AvatarUpload } from '@/components/AvatarUpload'
import { DashboardLayout } from '@/components/DashboardLayout'

export default function AthleteSettings() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user)
        supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
          setProfile(data)
          setFormData({
            full_name: data?.full_name || '',
            username: data?.username || '',
            avatar_url: data?.avatar_url || '',
            mobile_number: data?.mobile_number || '',
          })
        })
      } else {
        router.push('/login')
      }
    })
  }, [])

  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    avatar_url: '',
    mobile_number: '',
  })

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
      setNewPassword('')
      setConfirmPassword('')
      router.refresh()
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
    <DashboardLayout type="athlete" user={profile} >
      <div className="max-w-2xl mx-auto py-8">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your professional athlete profile and security.</p>
        </header>

        <div className="bg-card border border-border rounded-[2rem] shadow-sm overflow-hidden">
          <div className="p-8 space-y-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center text-center pb-8 border-b border-border">
              {user && (
                <AvatarUpload 
                  uid={user.id}
                  currentUrl={formData.avatar_url}
                  onUploadComplete={(url) => setFormData({ ...formData, avatar_url: url })}
                />
              )}
              <h2 className="mt-4 font-bold text-foreground">Profile Photo</h2>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-black mt-1">Athlete Identity</p>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="pl-11 h-12 bg-muted border-border rounded-xl focus:ring-primary font-bold text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">@</span>
                  <Input 
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    className="pl-9 h-12 bg-muted border-border rounded-xl focus:ring-primary font-bold text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mobile Number</label>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={formData.mobile_number}
                    onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                    placeholder="91XXXXXXXXXX"
                    className="pl-11 h-12 bg-muted border-border rounded-xl focus:ring-primary font-bold text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="pt-8 border-t border-border">
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-6 font-orbitron">Security & Access</h3>
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 8 chars)"
                    className="h-12 bg-muted border-border rounded-xl pr-12 focus:ring-primary font-bold text-foreground"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="h-12 bg-muted border-border rounded-xl focus:ring-primary font-bold text-foreground"
                />
              </div>
            </div>

            <Button 
              onClick={handleUpdate}
              disabled={isUpdating}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 mt-4 transition-all active:scale-95"
            >
              {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Synchronize Profile'}
            </Button>

            {/* Data Sovereignty */}
            <div className="pt-10 mt-6 border-t border-border">
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-6 font-orbitron">Data Sovereignty</h3>
              <div className="bg-muted rounded-2xl p-6 border border-border">
                <p className="text-[10px] text-muted-foreground font-bold leading-relaxed uppercase tracking-tight mb-4">
                  Your performance data belongs to you. To request a full export of your biometric logs and diagnostic profile in machine-readable format, please contact our support team.
                </p>
                <a href="mailto:creedaperformance@gmail.com" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                  Request Biometric Export →
                </a>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-10 mt-6 border-t border-border">
              <div className="bg-status-critical/10 rounded-2xl p-6 border border-status-critical/20">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldAlert className="h-5 w-5 text-status-critical" />
                  <h3 className="font-bold text-status-critical">Danger Zone</h3>
                </div>
                <p className="text-xs text-status-critical/80 mb-6 font-medium leading-relaxed">
                  Permanently erase your performance data and team associations. This action is irreversible and will purge all historical biometrics. Data will be permanently removed within 14 days of the request.
                </p>

                {!showDeleteConfirm ? (
                  <Button 
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest bg-status-critical hover:bg-status-critical/90 shadow-lg shadow-status-critical/20"
                  >
                    Initiate Account Deletion
                  </Button>
                ) : (
                  <div className="space-y-3 animate-in zoom-in-95 duration-200">
                    <p className="text-[10px] font-black text-status-critical text-center uppercase tracking-widest">Confirm Critical Override</p>
                    <div className="flex gap-3">
                      <Button 
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="flex-1 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest bg-status-critical"
                      >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Purge Everything'}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                        className="flex-1 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest border-border bg-card text-muted-foreground"
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
    </DashboardLayout>
  )
}
