'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UploadCloud, Loader2, User } from 'lucide-react'
import { toast } from 'sonner'

interface AvatarUploadProps {
  currentUrl?: string
  onUploadComplete: (url: string) => void
  uid: string
}

export function AvatarUpload({ currentUrl, onUploadComplete, uid }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(currentUrl)
  const supabase = createClient()

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${uid}-${crypto.randomUUID()}.${fileExt}`

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setPreviewUrl(publicUrl)
      onUploadComplete(publicUrl)
      toast.success('Avatar uploaded!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error uploading avatar!')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group/avatar">
        <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 p-1 shadow-xl">
          <div className="h-full w-full rounded-full bg-card flex items-center justify-center border-2 border-white overflow-hidden">
            {previewUrl ? (
              <img src={previewUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-muted" />
            )}
          </div>
        </div>
        
        {uploading && (
          <div className="absolute inset-0 bg-card/60 rounded-full flex items-center justify-center backdrop-blur-sm z-20">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
          </div>
        )}

        <label className="absolute inset-0 flex items-center justify-center bg-blue-600/0 hover:bg-blue-600/20 rounded-full cursor-pointer transition-all group-hover/avatar:opacity-100 opacity-0 z-10">
          <input
            type="file"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading}
            className="hidden"
          />
          <div className="bg-card/90 p-2 rounded-full shadow-lg">
            <UploadCloud className="h-5 w-5 text-blue-600" />
          </div>
        </label>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {uploading ? 'Synching...' : 'Tap to update profile picture'}
      </p>
    </div>
  )
}
