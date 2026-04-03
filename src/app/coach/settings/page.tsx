'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, ShieldAlert, Eye, EyeOff, User, MessageSquare } from 'lucide-react'
import { updateProfile, deleteAccount } from '@/app/athlete/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { AvatarUpload } from '@/components/AvatarUpload'
import { DashboardLayout } from '@/components/DashboardLayout'
import Link from 'next/link'

type ProfileRecord = {
  id: string
  email?: string | null
  full_name: string | null
  username: string | null
  avatar_url: string | null
  mobile_number: string | null
}

type AuthUserRecord = {
  id: string
  email?: string | null
}

export default function CoachSettings() {
  const [user, setUser] = useState<AuthUserRecord | null>(null)
  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    avatar_url: '',
    mobile_number: '',
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user)
        supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
          const nextProfile = (data || null) as ProfileRecord | null
          setProfile(nextProfile)
          setFormData({
            full_name: nextProfile?.full_name || '',
            username: nextProfile?.username || '',
            avatar_url: nextProfile?.avatar_url || '',
            mobile_number: nextProfile?.mobile_number || '',
          })
        })
      } else {
        router.push('/login')
      }
    })
  }, [router])

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
    <DashboardLayout type="coach" user={profile} >
      <div className="max-w-2xl mx-auto py-8">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Coach Control Center</h1>
          <p className="text-muted-foreground mt-1">Manage your administrative profile and squad security protocols.</p>
        </header>

        <div className="bg-card border border-border rounded-[2rem] shadow-sm overflow-hidden">
          <div className="p-8 space-y-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center text-center pb-8 border-b border-border/50">
              {user && (
                <AvatarUpload 
                  uid={user.id}
                  currentUrl={formData.avatar_url}
                  onUploadComplete={(url) => setFormData({ ...formData, avatar_url: url })}
                />
              )}
              <h2 className="mt-4 font-bold text-foreground">Admin Identity</h2>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-black mt-1">Squad Commander</p>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <Input 
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="pl-11 h-12 bg-muted/30 border-border rounded-xl focus:ring-blue-500 font-bold text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold">@</span>
                  <Input 
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    className="pl-9 h-12 bg-muted/30 border-border rounded-xl focus:ring-blue-500 font-bold text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Support / Contact Channel</label>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <Input
                    value={formData.mobile_number}
                    onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                    placeholder="91XXXXXXXXXX"
                    className="pl-11 h-12 bg-muted/30 border-border rounded-xl focus:ring-blue-500 font-bold text-muted-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="pt-8 border-t border-border/50">
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-6">Security Credentials</h3>
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Update admin password"
                    className="h-12 bg-muted/30 border-border rounded-xl pr-12 focus:ring-blue-500 font-bold text-muted-foreground"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new admin password"
                  className="h-12 bg-muted/30 border-border rounded-xl focus:ring-blue-500 font-bold text-muted-foreground"
                />
              </div>
            </div>

            <Button 
              onClick={handleUpdate}
              disabled={isUpdating}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-blue-500/20 mt-4 transition-all active:scale-95"
            >
              {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update Command Profile'}
            </Button>

            {/* Data Sovereignty */}
            <div className="pt-10 mt-6 border-t border-border/50">
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-6">Data Sovereignty</h3>
              <div className="bg-muted/30 rounded-2xl p-6 border border-border">
                <p className="text-[10px] text-muted-foreground font-bold leading-relaxed uppercase tracking-tight mb-4">
                  Manage data export, deletion, correction, and consent requests from your legal center.
                </p>
                <Link href="/coach/legal" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">
                  Open Legal & Privacy →
                </Link>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-10 mt-6 border-t border-border/50">
              <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                  <h3 className="font-bold text-red-900">Tactical Reset</h3>
                </div>
                <p className="text-xs text-red-700 mb-6 font-medium leading-relaxed">
                  Permanently erase your coach account and all associated squad data. This action will disconnect all athletes and wipe historical physiological logs. All data will be permanently removed after 14 days of the request.
                </p>

                {!showDeleteConfirm ? (
                  <Button 
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20"
                  >
                    Decommission Account
                  </Button>
                ) : (
                  <div className="space-y-3 animate-in zoom-in-95 duration-200">
                    <p className="text-[10px] font-black text-red-600 text-center uppercase tracking-widest">Confirm Administrative Wipe</p>
                    <div className="flex gap-3">
                      <Button 
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="flex-1 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest bg-red-600"
                      >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Wipe All Data'}
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
