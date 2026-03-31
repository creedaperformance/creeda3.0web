'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  return (
    <div className="animate-fade-up">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="mb-2 text-2xl font-black text-primary tracking-tight uppercase" style={{ fontFamily: 'var(--font-orbitron)' }}>Reset Password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="athlete@creeda.in"
            required
            className="transition-colors focus:border-primary"
          />
        </div>

        <Button type="submit" className="w-full h-11 text-base font-semibold">
          Send Reset Link
        </Button>
      </form>

      <div className="mt-8 flex justify-center sm:justify-start">
        <Link href="/login" className="flex items-center text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to login
        </Link>
      </div>
    </div>
  )
}
