'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'

type LoginFormState = {
  email: string
  password: string
  rememberMe: boolean
  savedAccounts: Record<string, string>
}

function readSavedLoginState(): LoginFormState {
  const initialState: LoginFormState = {
    email: '',
    password: '',
    rememberMe: false,
    savedAccounts: {},
  }

  if (typeof window === 'undefined') return initialState

  try {
    const storedAccounts = window.localStorage.getItem('creeda_saved_accounts')
    const parsedAccounts: Record<string, string> = storedAccounts ? JSON.parse(storedAccounts) : {}
    const lastEmail = window.localStorage.getItem('creeda_last_email')

    if (lastEmail && parsedAccounts[lastEmail]) {
      return {
        email: lastEmail,
        password: parsedAccounts[lastEmail],
        rememberMe: true,
        savedAccounts: parsedAccounts,
      }
    }

    return {
      ...initialState,
      savedAccounts: parsedAccounts,
    }
  } catch (e) {
    console.error('Error loading saved accounts:', e)
    return initialState
  }
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formState, setFormState] = useState<LoginFormState>(() => readSavedLoginState())
  const { email, password, rememberMe, savedAccounts } = formState

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value
    
    // Auto-fill password if the email is recognized
    if (savedAccounts[newEmail]) {
      setFormState((current) => ({
        ...current,
        email: newEmail,
        password: savedAccounts[newEmail],
        rememberMe: true,
      }))
    } else {
      // If the email is unknown, clear the password field to prevent logging in with previous user's password
      setFormState((current) => ({
        ...current,
        email: newEmail,
        password: '',
        rememberMe: false,
      }))
    }
  }

  async function onSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const submittedEmail = formData.get('email') as string
    const submittedPassword = formData.get('password') as string
    
    try {
      const updatedAccounts = { ...savedAccounts }
      
      if (rememberMe && submittedEmail && submittedPassword) {
        updatedAccounts[submittedEmail] = submittedPassword
        localStorage.setItem('creeda_saved_accounts', JSON.stringify(updatedAccounts))
        localStorage.setItem('creeda_last_email', submittedEmail)
        setFormState((current) => ({ ...current, savedAccounts: updatedAccounts }))
      } else if (!rememberMe && submittedEmail) {
        // If "Remember Me" is unchecked, remove this specific email from memory
        delete updatedAccounts[submittedEmail]
        localStorage.setItem('creeda_saved_accounts', JSON.stringify(updatedAccounts))
        
        if (localStorage.getItem('creeda_last_email') === submittedEmail) {
          localStorage.removeItem('creeda_last_email')
        }
        setFormState((current) => ({ ...current, savedAccounts: updatedAccounts }))
      }
    } catch (e) {
      console.error('Error saving account to local storage:', e)
    }

    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[500px] flex flex-col justify-center py-12 px-6 lg:px-8 z-10 animate-fade-up">
      {/* HUD Background Glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full" />
      </div>

      <div className="mb-10 text-center sm:text-left">
        <h1 className="mb-2 text-3xl font-black text-primary tracking-tighter uppercase italic" style={{ fontFamily: 'var(--font-orbitron)' }}>
          Command <span className="text-white">Access</span>
        </h1>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">
          Secure Intelligence Entry
        </p>
      </div>

      <form action={onSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="athlete@creeda.in"
              required
              disabled={loading}
              value={email}
              onChange={handleEmailChange}
              className="transition-colors focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading}
                value={password}
                onChange={(e) => setFormState((current) => ({ ...current, password: e.target.value }))}
                className="transition-colors focus:border-primary pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="rememberMe"
              name="rememberMe"
              checked={rememberMe}
              onChange={(e) => setFormState((current) => ({ ...current, rememberMe: e.target.checked }))}
              className="h-4 w-4 rounded border-border bg-muted/40 text-primary focus:ring-primary focus:ring-offset-background"
            />
            <Label htmlFor="rememberMe" className="text-sm cursor-pointer text-muted-foreground">
              Remember me on this device
            </Label>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-500 font-medium dark:bg-red-950/50 dark:text-red-400">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground sm:text-left">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
